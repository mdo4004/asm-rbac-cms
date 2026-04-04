const db = require('../config/db');
const pad    = (n) => String(n).padStart(4,'0');
const fmtD   = (d) => { if(!d) return '—'; const dt=new Date(d); return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`; };
const fmtCur = (n) => '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

const reserveSPONo = async (conn) => {
  const year=new Date().getFullYear();
  const [rows]=await conn.execute('SELECT last_number FROM spo_sequence WHERE year=? FOR UPDATE',[year]);
  let next;
  if(!rows.length){await conn.execute('INSERT INTO spo_sequence (year,last_number) VALUES (?,1)',[year]);next=1;}
  else{next=rows[0].last_number+1;await conn.execute('UPDATE spo_sequence SET last_number=? WHERE year=?',[next,year]);}
  return `SPO/${year}/${pad(next)}`;
};

exports.fetchCPO = async (req,res) => {
  try{
    const no=(req.query.no||'').trim();
    if(!no) return res.status(400).json({success:false,message:'CPO number required'});
    const [rows]=await db.execute('SELECT * FROM cpo_orders WHERE order_no=? AND is_active=1',[no]);
    if(!rows.length) return res.status(404).json({success:false,message:`CPO "${no}" not found`});
    const cpo=rows[0];
    const [skus]=await db.execute('SELECT * FROM cpo_skus WHERE cpo_id=? ORDER BY sort_order',[cpo.id]);
    res.json({success:true,cpo,skus});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.create = async (req,res) => {
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const{cpo_id,cpo_no,supplier_name,merchant,spo_date,delivery_date,rate,notes,selected_skus}=req.body;
    if(!selected_skus||!selected_skus.length) throw new Error('Select at least one SKU');
    if(!supplier_name) throw new Error('Supplier name is required');
    const created=[];
    for(const item of selected_skus){
      const spo_number=await reserveSPONo(conn);
      const [r]=await conn.execute(
        `INSERT INTO spo_orders (spo_number,cpo_id,cpo_no,supplier_name,merchant,spo_date,delivery_date,rate,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [spo_number,cpo_id,cpo_no,supplier_name,merchant,spo_date,delivery_date,rate||0,notes,req.user.id]
      );
      await conn.execute('INSERT INTO spo_skus (spo_id,sku_id,grey_qty,rate) VALUES (?,?,?,?)',
        [r.insertId,item.sku_id,item.grey_qty||0,rate||0]);
      created.push({spo_id:r.insertId,spo_number});
    }
    await conn.commit();
    res.json({success:true,created});
  }catch(e){await conn.rollback();console.error(e);res.status(500).json({success:false,message:e.message||'Server error'});}
  finally{conn.release();}
};

// PUT /api/orders/spo/:id
exports.update = async (req,res) => {
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const{supplier_name,merchant,spo_date,delivery_date,rate,notes,grey_qty}=req.body;
    await conn.execute(
      `UPDATE spo_orders SET supplier_name=?,merchant=?,spo_date=?,delivery_date=?,rate=?,notes=?,updated_at=NOW() WHERE id=?`,
      [supplier_name,merchant,spo_date,delivery_date,rate||0,notes,req.params.id]
    );
    if(grey_qty!==undefined){
      await conn.execute('UPDATE spo_skus SET grey_qty=?,rate=? WHERE spo_id=?',[grey_qty||0,rate||0,req.params.id]);
    }
    await conn.commit();
    res.json({success:true,message:'SPO updated'});
  }catch(e){await conn.rollback();console.error(e);res.status(500).json({success:false,message:e.message||'Server error'});}
  finally{conn.release();}
};

exports.getAll = async (req,res) => {
  try{
    const page       = Math.max(1,parseInt(req.query.page)||1);
    const limit      = Math.min(100,parseInt(req.query.limit)||10);
    const offset     = (page-1)*limit;
    const date_from  = (req.query.date_from||'').trim();
    const date_to    = (req.query.date_to||'').trim();
    const spo_number = (req.query.spo_number||'').trim();
    const supplier   = (req.query.supplier_name||'').trim();
    const cpo_no     = (req.query.cpo_no||'').trim();
    const quality    = (req.query.quality||'').trim();

    let conditions=['s.is_active=1'], params=[];
    if(date_from)  { conditions.push('s.spo_date >= ?');       params.push(date_from); }
    if(date_to)    { conditions.push('s.spo_date <= ?');       params.push(date_to); }
    if(spo_number) { conditions.push('s.spo_number LIKE ?');   params.push(`%${spo_number}%`); }
    if(supplier)   { conditions.push('s.supplier_name LIKE ?');params.push(`%${supplier}%`); }
    if(cpo_no)     { conditions.push('s.cpo_no LIKE ?');       params.push(`%${cpo_no}%`); }
    if(quality)    { conditions.push('cs.quality LIKE ?');     params.push(`%${quality}%`); }

    const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
    const [rows]=await db.execute(
      `SELECT s.*,cs.quality,cs.color,cs.width,cs.fabric_type,cs.gsm,cs.finish_qty AS orig_finish_qty,
              ss.grey_qty AS sku_grey_qty,co.customer_name,co.selling_firm,co.po_date AS cpo_po_date
       FROM spo_orders s
       JOIN spo_skus ss ON ss.spo_id=s.id
       JOIN cpo_skus cs ON cs.id=ss.sku_id
       JOIN cpo_orders co ON co.id=s.cpo_id
       ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params,limit,offset]
    );
    const [[{total}]]=await db.execute(
      `SELECT COUNT(*) AS total FROM spo_orders s
       JOIN spo_skus ss ON ss.spo_id=s.id JOIN cpo_skus cs ON cs.id=ss.sku_id
       ${where}`, params
    );
    res.json({success:true,data:rows,total,page,limit,pages:Math.ceil(total/limit)});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.getOne = async (req,res) => {
  try{
    const [rows]=await db.execute(
      `SELECT s.*,co.customer_name,co.selling_firm FROM spo_orders s
       JOIN cpo_orders co ON co.id=s.cpo_id WHERE s.id=? AND s.is_active=1`,[req.params.id]
    );
    if(!rows.length) return res.status(404).json({success:false,message:'Not found'});
    const [skus]=await db.execute(
      `SELECT ss.*,cs.quality,cs.color,cs.fabric_type,cs.width,cs.gsm,cs.finish_qty
       FROM spo_skus ss JOIN cpo_skus cs ON cs.id=ss.sku_id WHERE ss.spo_id=?`,[req.params.id]
    );
    res.json({success:true,data:{...rows[0],skus}});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.remove = async (req,res) => {
  try{await db.execute('UPDATE spo_orders SET is_active=0 WHERE id=?',[req.params.id]);res.json({success:true});}
  catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.getPDF = async (req,res) => {
  try{
    const [rows]=await db.execute(
      `SELECT s.*,co.customer_name,co.selling_firm FROM spo_orders s
       JOIN cpo_orders co ON co.id=s.cpo_id WHERE s.id=? AND s.is_active=1`,[req.params.id]
    );
    if(!rows.length) return res.status(404).json({success:false,message:'Not found'});
    const spo=rows[0];
    const [skus]=await db.execute(
      `SELECT ss.*,cs.quality,cs.color,cs.fabric_type,cs.width,cs.gsm,cs.finish_qty
       FROM spo_skus ss JOIN cpo_skus cs ON cs.id=ss.sku_id WHERE ss.spo_id=?`,[req.params.id]
    );
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(buildSPOPDF(spo,skus));
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

function buildSPOPDF(spo,skus){
  const total=skus.reduce((s,r)=>s+Number(r.grey_qty)*Number(r.rate),0);
  const firmName=spo.selling_firm||'AJANTA SILK';
  const gst=firmName.toLowerCase().includes('mills')?'24AARCA9664Q1ZM':'24AEQPS5651B1ZE';
  const skuRows=skus.map((s,i)=>`
    <tr>
      <td class="tc">${i+1}</td>
      <td><strong>${s.quality||'—'}</strong></td>
      <td class="tc">${s.width||'—'}</td>
      <td class="tr"><strong>${Number(s.grey_qty).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
      <td class="tr">₹${Number(s.rate).toFixed(2)}</td>
      <td class="tr"><strong>${fmtCur(Number(s.grey_qty)*Number(s.rate))}</strong></td>
    </tr>`).join('');
  const genDate=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SPO — ${spo.spo_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#f0f2f5}
.no-print{background:#1a3a8b;color:#fff;text-align:center;padding:12px 20px;position:sticky;top:0;z-index:99;display:flex;align-items:center;justify-content:center;gap:16px;font-size:13px}
.no-print button{background:#fff;color:#1a3a8b;border:none;padding:8px 24px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer}
.no-print button:hover{background:#e8f0fe}
.page{max-width:750px;margin:20px auto;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.12);overflow:hidden}
.hdr{background:linear-gradient(135deg,#1a3a8b 0%,#2451c7 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}
.co-name{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px}
.co-sub{font-size:10px;color:rgba(255,255,255,.75);margin-top:3px}
.co-addr{font-size:10px;color:rgba(255,255,255,.6);margin-top:5px;line-height:1.5}
.doc-badge{text-align:right}
.doc-type{font-size:10px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:3px;text-transform:uppercase}
.doc-no{font-size:20px;font-weight:900;color:#fff;margin-top:4px}
.doc-date{font-size:10px;color:rgba(255,255,255,.6);margin-top:3px}
.body{padding:24px 32px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
.info-box{background:#f8faff;border:1px solid #e3eaff;border-radius:6px;padding:12px 14px}
.info-box .title{font-size:9px;font-weight:700;color:#6b7ab8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
.info-row{display:flex;justify-content:space-between;margin-bottom:4px}
.info-row:last-child{margin-bottom:0}
.info-k{font-size:10px;color:#8892b0}
.info-v{font-size:11px;font-weight:600;color:#1a1a2e;text-align:right}
.info-v.hi{color:#1a3a8b;font-weight:700}
.sec-title{font-size:11px;font-weight:700;color:#1a3a8b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e3eaff}
.rem{background:#fffbeb;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:16px}
.rem .lbl{font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;margin-bottom:3px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
thead tr{background:linear-gradient(90deg,#1a3a8b,#2451c7)}
th{padding:9px 10px;color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:left}
td{padding:8px 10px;border-bottom:1px solid #eef0f8}
tr:nth-child(even) td{background:#f8faff}
tr:last-child td{border-bottom:none}
.tc{text-align:center}.tr{text-align:right}
.tot-row{display:flex;justify-content:flex-end;align-items:center;gap:20px;background:linear-gradient(135deg,#f0f4ff,#e8f0ff);border:1px solid #c5d3ff;border-radius:6px;padding:14px 20px;margin-bottom:16px}
.tot-label{font-weight:700;color:#6b7ab8;font-size:12px}
.tot-amount{font-size:22px;font-weight:900;color:#1a3a8b}
.terms{background:#f8faff;border:1px solid #e3eaff;border-radius:6px;padding:12px 14px;margin-bottom:20px}
.terms .title{font-size:9px;font-weight:700;color:#6b7ab8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
.terms ol{padding-left:16px}
.terms li{font-size:10px;margin-bottom:3px;color:#444;line-height:1.5}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding-top:20px;border-top:2px dashed #e3eaff}
.sig-box{text-align:center}
.sig-line{border-top:1.5px solid #c5d3ff;margin-top:36px;padding-top:6px}
.sig-name{font-size:10px;font-weight:700;color:#1a3a8b}
.sig-sub{font-size:9px;color:#8892b0;margin-top:2px}
.footer{background:#f8faff;border-top:1px solid #e3eaff;padding:10px 32px;text-align:center;font-size:9px;color:#aab;margin-top:20px}
@media print{.no-print{display:none!important}.page{box-shadow:none;margin:0;border-radius:0}body{background:#fff}}
</style></head><body>
<div class="no-print">
  <span>📄 SPO: <strong>${spo.spo_number}</strong> — Review document below, then print</span>
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="page">
  <div class="hdr">
    <div>
      <div class="co-name">${firmName}</div>
      <div class="co-sub">Textile Merchants &amp; Processors | GST: ${gst}</div>
      <div class="co-addr">Radha Krishna Logistics Park, A-4004/4003, Behind Bharat Cancer Hospital<br>Saroli, Surat — Gujarat 395010</div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Supplier Purchase Order</div>
      <div class="doc-no">${spo.spo_number}</div>
      <div class="doc-date">Generated: ${genDate}</div>
    </div>
  </div>
  <div class="body">
    <div class="grid3">
      <div class="info-box">
        <div class="title">📋 Order Details</div>
        <div class="info-row"><span class="info-k">SPO Number</span><span class="info-v hi">${spo.spo_number}</span></div>
        <div class="info-row"><span class="info-k">SPO Date</span><span class="info-v">${fmtD(spo.spo_date)}</span></div>
        <div class="info-row"><span class="info-k">Delivery Date</span><span class="info-v">${fmtD(spo.delivery_date)}</span></div>
        <div class="info-row"><span class="info-k">Customer Order</span><span class="info-v hi">${spo.cpo_no||'—'}</span></div>
        <div class="info-row"><span class="info-k">Selling Firm</span><span class="info-v">${firmName}</span></div>
      </div>
      <div class="info-box">
        <div class="title">🏭 Supplier Details</div>
        <div class="info-row"><span class="info-k">Supplier</span><span class="info-v hi">${spo.supplier_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Quality</span><span class="info-v">${skus[0]?.quality||'—'}</span></div>
        <div class="info-row"><span class="info-k">Width</span><span class="info-v">${skus[0]?.width||'—'}"</span></div>
        <div class="info-row"><span class="info-k">GSM</span><span class="info-v">${skus[0]?.gsm||'—'}</span></div>
        <div class="info-row"><span class="info-k">Fabric</span><span class="info-v">${skus[0]?.fabric_type||'—'}</span></div>
      </div>
      <div class="info-box">
        <div class="title">🏷️ Order Reference</div>
        <div class="info-row"><span class="info-k">Customer</span><span class="info-v">${spo.customer_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Merchant</span><span class="info-v">${spo.merchant||'—'}</span></div>
        <div class="info-row"><span class="info-k">Color</span><span class="info-v">${skus[0]?.color||'—'}</span></div>
        <div class="info-row"><span class="info-k">Rate</span><span class="info-v hi">₹${Number(spo.rate||0).toFixed(2)}/m</span></div>
      </div>
    </div>
    ${spo.notes?`<div class="rem"><div class="lbl">✏️ Special Instructions / Remarks</div><div>${spo.notes}</div></div>`:''}
    <div class="sec-title">📦 Supply Items</div>
    <table>
      <thead><tr><th class="tc">#</th><th>Quality / Description</th><th class="tc">Width</th><th class="tr">Grey Qty (Mtr)</th><th class="tr">Rate (₹/Mtr)</th><th class="tr">Amount (₹)</th></tr></thead>
      <tbody>${skuRows}</tbody>
    </table>
    <div class="tot-row">
      <span class="tot-label">TOTAL AMOUNT</span>
      <span class="tot-amount">${fmtCur(total)}</span>
    </div>
    <div class="terms">
      <div class="title">📜 Terms &amp; Conditions</div>
      <ol>
        <li>Quality and shade to be strictly as per approved sample.</li>
        <li>Delivery on or before the date mentioned above.</li>
        <li>Any shortage or quality defect will be supplier's responsibility.</li>
        <li>Invoice to be submitted along with delivery challan.</li>
        <li>Payment will be processed as per agreed payment terms.</li>
      </ol>
    </div>
    <div class="sigs">
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Prepared By</div><div class="sig-sub">Name &amp; Stamp</div></div></div>
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Supplier Acknowledgement</div><div class="sig-sub">Stamp &amp; Sign</div></div></div>
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Authorised Signatory</div><div class="sig-sub">${firmName}</div></div></div>
    </div>
  </div>
  <div class="footer">This is a computer-generated document. | ${firmName}, Surat | SPO: ${spo.spo_number} | ${genDate}</div>
</div>
</body></html>`;
}
