const db = require('../config/db');

const pad    = (n) => String(n).padStart(4,'0');
const fmtD   = (d) => { if (!d) return '—'; const dt=new Date(d); return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`; };
const fmtCur = (n) => '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

const reserveNo = async (conn,year,prefix) => {
  const [rows] = await conn.execute('SELECT last_number FROM cpo_order_seq WHERE year=? AND prefix=? FOR UPDATE',[year,prefix]);
  let next;
  if (!rows.length){await conn.execute('INSERT INTO cpo_order_seq (year,prefix,last_number) VALUES (?,?,1)',[year,prefix]);next=1;}
  else{next=rows[0].last_number+1;await conn.execute('UPDATE cpo_order_seq SET last_number=? WHERE year=? AND prefix=?',[next,year,prefix]);}
  return `${prefix}/${year}/${pad(next)}`;
};

exports.previewNo = async (req,res) => {
  try{
    const {prefix}=req.query;
    if(!prefix) return res.status(400).json({success:false,message:'prefix required'});
    const year=new Date().getFullYear();
    const [rows]=await db.execute('SELECT last_number FROM cpo_order_seq WHERE year=? AND prefix=?',[year,prefix]);
    const next=(rows[0]?.last_number||0)+1;
    res.json({success:true,preview:`${prefix}/${year}/${pad(next)}`});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.create = async (req,res) => {
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const{selling_firm,firm_prefix,customer_name,followup_person,merchant,mill_name,weaver_name,po_date,delivery_date,skus}=req.body;
    if(!firm_prefix) throw new Error('Selling firm / prefix is required');
    if(!skus||!skus.length) throw new Error('Add at least one SKU');
    const year=new Date().getFullYear();
    const order_no=await reserveNo(conn,year,firm_prefix);
    const [cpoRes]=await conn.execute(
      `INSERT INTO cpo_orders (order_no,selling_firm,firm_prefix,customer_name,followup_person,merchant,mill_name,weaver_name,po_date,delivery_date,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [order_no,selling_firm,firm_prefix,customer_name,followup_person,merchant,mill_name,weaver_name,po_date,delivery_date,req.user.id]
    );
    const cpoId=cpoRes.insertId;
    for(let i=0;i<skus.length;i++){
      const s=skus[i];
      const label=[s.quality,s.color,s.fabric_type].filter(Boolean).join('-');
      await conn.execute(
        `INSERT INTO cpo_skus (cpo_id,quality,color,fabric_type,width,gsm,finish_qty,grey_qty,rate,sku_label,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [cpoId,s.quality,s.color,s.fabric_type,s.width,s.gsm,s.finish_qty||0,s.grey_qty||0,s.rate||0,label,i+1]
      );
    }
    await conn.commit();
    res.json({success:true,order_no,id:cpoId});
  }catch(e){await conn.rollback();console.error(e);res.status(500).json({success:false,message:e.message||'Server error'});}
  finally{conn.release();}
};

// PUT /api/orders/cpo/:id  — update CPO + replace SKUs
exports.update = async (req,res) => {
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const{customer_name,followup_person,merchant,mill_name,weaver_name,po_date,delivery_date,skus}=req.body;
    await conn.execute(
      `UPDATE cpo_orders SET customer_name=?,followup_person=?,merchant=?,mill_name=?,weaver_name=?,po_date=?,delivery_date=?,updated_at=NOW() WHERE id=?`,
      [customer_name,followup_person,merchant,mill_name,weaver_name,po_date,delivery_date,req.params.id]
    );
    if(skus&&skus.length){
      await conn.execute('DELETE FROM cpo_skus WHERE cpo_id=?',[req.params.id]);
      for(let i=0;i<skus.length;i++){
        const s=skus[i];
        const label=[s.quality,s.color,s.fabric_type].filter(Boolean).join('-');
        await conn.execute(
          `INSERT INTO cpo_skus (cpo_id,quality,color,fabric_type,width,gsm,finish_qty,grey_qty,rate,sku_label,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [req.params.id,s.quality,s.color,s.fabric_type,s.width,s.gsm,s.finish_qty||0,s.grey_qty||0,s.rate||0,label,i+1]
        );
      }
    }
    await conn.commit();
    res.json({success:true,message:'CPO updated'});
  }catch(e){await conn.rollback();console.error(e);res.status(500).json({success:false,message:e.message||'Server error'});}
  finally{conn.release();}
};

exports.getAll = async (req,res) => {
  try{
    const page      = Math.max(1,parseInt(req.query.page)||1);
    const limit     = Math.min(100,parseInt(req.query.limit)||10);
    const offset    = (page-1)*limit;
    const search    = (req.query.search||'').trim();
    const date_from = (req.query.date_from||'').trim();
    const date_to   = (req.query.date_to||'').trim();
    const order_no  = (req.query.order_no||'').trim();
    const customer  = (req.query.customer_name||'').trim();
    const merchant  = (req.query.merchant||'').trim();
    const firm      = (req.query.selling_firm||'').trim();

    let conditions=['c.is_active=1'], params=[];
    if(search){
      conditions.push('(c.order_no LIKE ? OR c.customer_name LIKE ? OR c.selling_firm LIKE ?)');
      params.push(`%${search}%`,`%${search}%`,`%${search}%`);
    }
    if(date_from){ conditions.push('c.po_date >= ?'); params.push(date_from); }
    if(date_to)  { conditions.push('c.po_date <= ?'); params.push(date_to); }
    if(order_no) { conditions.push('c.order_no LIKE ?'); params.push(`%${order_no}%`); }
    if(customer) { conditions.push('c.customer_name LIKE ?'); params.push(`%${customer}%`); }
    if(merchant) { conditions.push('c.merchant LIKE ?'); params.push(`%${merchant}%`); }
    if(firm)     { conditions.push('c.selling_firm LIKE ?'); params.push(`%${firm}%`); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const [rows]=await db.query(
      `SELECT c.*, COUNT(sk.id) AS sku_count, SUM(sk.finish_qty) AS total_finish, SUM(sk.grey_qty) AS total_grey
       FROM cpo_orders c LEFT JOIN cpo_skus sk ON sk.cpo_id=c.id
       ${where} GROUP BY c.id ORDER BY c.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );
    const [[{total}]]=await db.query(
      `SELECT COUNT(*) AS total FROM cpo_orders c ${where}`, params
    );
    res.json({success:true,data:rows,total,page,limit,pages:Math.ceil(total/limit)});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.getOne = async (req,res) => {
  try{
    const [rows]=await db.execute('SELECT * FROM cpo_orders WHERE id=? AND is_active=1',[req.params.id]);
    if(!rows.length) return res.status(404).json({success:false,message:'Not found'});
    const [skus]=await db.execute('SELECT * FROM cpo_skus WHERE cpo_id=? ORDER BY sort_order',[req.params.id]);
    res.json({success:true,data:{...rows[0],skus}});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.remove = async (req,res) => {
  try{
    await db.execute('UPDATE cpo_orders SET is_active=0 WHERE id=?',[req.params.id]);
    res.json({success:true});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

// ── PDF — view-first, no auto-print ──────────────────────────
exports.getPDF = async (req,res) => {
  try{
    const [rows]=await db.execute('SELECT * FROM cpo_orders WHERE id=? AND is_active=1',[req.params.id]);
    if(!rows.length) return res.status(404).json({success:false,message:'Not found'});
    const cpo=rows[0];
    const [skus]=await db.execute('SELECT * FROM cpo_skus WHERE cpo_id=? ORDER BY sort_order',[req.params.id]);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(buildCPOPDF(cpo,skus));
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

function buildCPOPDF(cpo,skus){
  const totalFinish=skus.reduce((s,r)=>s+Number(r.finish_qty||0),0);
  const totalGrey=skus.reduce((s,r)=>s+Number(r.grey_qty||0),0);
  const rows=skus.map((s,i)=>`
    <tr>
      <td class="tc">${i+1}</td>
      <td><strong>${s.quality||'—'}</strong></td>
      <td>${s.color||'—'}</td>
      <td>${s.fabric_type||'—'}</td>
      <td class="tc">${s.width||'—'}</td>
      <td class="tc">${s.gsm||'—'}</td>
      <td class="tr"><strong>${Number(s.finish_qty).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
      <td class="tr"><strong>${Number(s.grey_qty).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
      <td class="tr">${s.rate>0?'₹'+Number(s.rate).toFixed(2):'Auto'}</td>
    </tr>`).join('');
  const genDate=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPO — ${cpo.order_no}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#f0f2f5}
.no-print{background:#1a3a8b;color:#fff;text-align:center;padding:12px 20px;position:sticky;top:0;z-index:99;display:flex;align-items:center;justify-content:center;gap:16px;font-size:13px}
.no-print button{background:#fff;color:#1a3a8b;border:none;padding:8px 24px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s}
.no-print button:hover{background:#e8f0fe;transform:scale(1.03)}
.page{max-width:750px;margin:20px auto;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.12);overflow:hidden}
.hdr{background:linear-gradient(135deg,#1a3a8b 0%,#2451c7 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}
.co-name{font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px}
.co-sub{font-size:11px;color:rgba(255,255,255,.75);margin-top:3px}
.co-addr{font-size:10px;color:rgba(255,255,255,.65);margin-top:6px;line-height:1.5}
.doc-badge{text-align:right}
.doc-type{font-size:11px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:3px;text-transform:uppercase}
.doc-no{font-size:20px;font-weight:900;color:#fff;margin-top:4px;letter-spacing:1px}
.doc-date{font-size:10px;color:rgba(255,255,255,.6);margin-top:3px}
.body{padding:24px 32px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.info-box{background:#f8faff;border:1px solid #e3eaff;border-radius:6px;padding:12px 14px}
.info-box .title{font-size:9px;font-weight:700;color:#6b7ab8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;display:flex;align-items:center;gap:5px}
.info-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.info-row:last-child{margin-bottom:0}
.info-k{font-size:10px;color:#8892b0}
.info-v{font-size:11px;font-weight:600;color:#1a1a2e;text-align:right}
.info-v.hi{color:#1a3a8b;font-weight:700}
.sec-title{font-size:11px;font-weight:700;color:#1a3a8b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e3eaff;display:flex;align-items:center;gap:6px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
thead tr{background:linear-gradient(90deg,#1a3a8b,#2451c7)}
th{padding:9px 10px;text-align:left;color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
td{padding:8px 10px;border-bottom:1px solid #eef0f8}
tr:nth-child(even) td{background:#f8faff}
tr:last-child td{border-bottom:none}
.tc{text-align:center}.tr{text-align:right}
.totals{background:linear-gradient(135deg,#f0f4ff,#e8f0ff);border:1px solid #c5d3ff;border-radius:6px;padding:14px 20px;display:flex;justify-content:flex-end;gap:40px;margin-bottom:20px}
.tot-item{text-align:center}
.tot-label{font-size:9px;color:#6b7ab8;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.tot-val{font-size:18px;font-weight:900;color:#1a3a8b;margin-top:2px}
.tot-unit{font-size:10px;color:#8892b0}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:24px;padding-top:20px;border-top:2px dashed #e3eaff}
.sig-box{text-align:center}
.sig-line{border-top:1.5px solid #c5d3ff;margin-top:36px;padding-top:6px}
.sig-name{font-size:10px;font-weight:700;color:#1a3a8b}
.sig-sub{font-size:9px;color:#8892b0;margin-top:2px}
.footer{background:#f8faff;border-top:1px solid #e3eaff;padding:10px 32px;text-align:center;font-size:9px;color:#aab;margin-top:24px}
@media print{.no-print{display:none!important}.page{box-shadow:none;margin:0;border-radius:0}body{background:#fff}}
</style></head><body>
<div class="no-print">
  <span>📄 CPO: <strong>${cpo.order_no}</strong> — Review your document below, then click Print</span>
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="page">
  <div class="hdr">
    <div>
      <div class="co-name">${cpo.selling_firm||'AJANTA SILK'}</div>
      <div class="co-sub">Textile Merchants &amp; Processors</div>
      <div class="co-addr">Radha Krishna Logistics Park, A-4004/4003<br>Behind Bharat Cancer Hospital, Saroli, Surat — Gujarat 395010</div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Customer Purchase Order</div>
      <div class="doc-no">${cpo.order_no}</div>
      <div class="doc-date">Generated: ${genDate}</div>
    </div>
  </div>
  <div class="body">
    <div class="grid3">
      <div class="info-box">
        <div class="title">📋 Order Info</div>
        <div class="info-row"><span class="info-k">Order No</span><span class="info-v hi">${cpo.order_no}</span></div>
        <div class="info-row"><span class="info-k">PO Date</span><span class="info-v">${fmtD(cpo.po_date)}</span></div>
        <div class="info-row"><span class="info-k">Delivery</span><span class="info-v">${fmtD(cpo.delivery_date)}</span></div>
        <div class="info-row"><span class="info-k">Selling Firm</span><span class="info-v hi">${cpo.selling_firm||'—'}</span></div>
      </div>
      <div class="info-box">
        <div class="title">👤 Customer</div>
        <div class="info-row"><span class="info-k">Name</span><span class="info-v hi">${cpo.customer_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Merchant</span><span class="info-v">${cpo.merchant||'—'}</span></div>
        <div class="info-row"><span class="info-k">Followup</span><span class="info-v">${cpo.followup_person||'—'}</span></div>
      </div>
      <div class="info-box">
        <div class="title">🏭 Production</div>
        <div class="info-row"><span class="info-k">Mill Name</span><span class="info-v">${cpo.mill_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Weaver</span><span class="info-v">${cpo.weaver_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Total SKUs</span><span class="info-v hi">${skus.length}</span></div>
      </div>
    </div>
    <div class="sec-title">📦 SKU / Line Items</div>
    <table>
      <thead><tr><th class="tc">#</th><th>Quality</th><th>Color</th><th>Fabric</th><th class="tc">Width</th><th class="tc">GSM</th><th class="tr">Finish Qty (m)</th><th class="tr">Grey Qty (m)</th><th class="tr">Rate</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="tot-item"><div class="tot-label">Total Finish Qty</div><div class="tot-val">${totalFinish.toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="tot-unit">metres</div></div>
      <div class="tot-item"><div class="tot-label">Total Grey Qty</div><div class="tot-val">${totalGrey.toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="tot-unit">metres</div></div>
    </div>
    <div class="sigs">
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Prepared By</div><div class="sig-sub">Name &amp; Stamp</div></div></div>
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Customer Acknowledgement</div><div class="sig-sub">Stamp &amp; Sign</div></div></div>
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Authorised Signatory</div><div class="sig-sub">${cpo.selling_firm||'AJANTA SILK'}</div></div></div>
    </div>
  </div>
  <div class="footer">This is a computer-generated document. | ${cpo.selling_firm||'Ajanta Silk'}, Surat | CPO: ${cpo.order_no} | ${genDate}</div>
</div>
</body></html>`;
}
