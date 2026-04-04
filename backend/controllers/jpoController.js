const db = require('../config/db');
const pad    = (n) => String(n).padStart(4,'0');
const fmtD   = (d) => { if(!d) return '—'; const dt=new Date(d); return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`; };
const fmtCur = (n) => '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

const reserveJPONo = async (conn) => {
  const year=new Date().getFullYear();
  const [rows]=await conn.execute('SELECT last_number FROM jpo_sequence WHERE year=? FOR UPDATE',[year]);
  let next;
  if(!rows.length){await conn.execute('INSERT INTO jpo_sequence (year,last_number) VALUES (?,1)',[year]);next=1;}
  else{next=rows[0].last_number+1;await conn.execute('UPDATE jpo_sequence SET last_number=? WHERE year=?',[next,year]);}
  return `JPO/${year}/${pad(next)}`;
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
    const{cpo_id,cpo_no,jobworker_name,process_type,jpo_date,delivery_date,rate,notes,selected_skus}=req.body;
    if(!selected_skus||!selected_skus.length) throw new Error('Select at least one SKU');
    if(!jobworker_name) throw new Error('Mill / Jobworker name is required');
    const created=[];
    for(const item of selected_skus){
      const jpo_number=await reserveJPONo(conn);
      const [r]=await conn.execute(
        `INSERT INTO jpo_orders (jpo_number,cpo_id,cpo_no,jobworker_name,process_type,jpo_date,delivery_date,rate,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [jpo_number,cpo_id,cpo_no,jobworker_name,process_type,jpo_date,delivery_date,rate||0,notes,req.user.id]
      );
      await conn.execute('INSERT INTO jpo_skus (jpo_id,sku_id,finish_qty,grey_qty,rate) VALUES (?,?,?,?,?)',
        [r.insertId,item.sku_id,item.finish_qty||0,item.grey_qty||0,rate||0]);
      created.push({jpo_id:r.insertId,jpo_number});
    }
    await conn.commit();
    res.json({success:true,created});
  }catch(e){await conn.rollback();console.error(e);res.status(500).json({success:false,message:e.message||'Server error'});}
  finally{conn.release();}
};

// PUT /api/orders/jpo/:id
exports.update = async (req,res) => {
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const{jobworker_name,process_type,jpo_date,delivery_date,rate,notes,finish_qty,grey_qty}=req.body;
    await conn.execute(
      `UPDATE jpo_orders SET jobworker_name=?,process_type=?,jpo_date=?,delivery_date=?,rate=?,notes=?,updated_at=NOW() WHERE id=?`,
      [jobworker_name,process_type,jpo_date,delivery_date,rate||0,notes,req.params.id]
    );
    if(finish_qty!==undefined||grey_qty!==undefined){
      await conn.execute('UPDATE jpo_skus SET finish_qty=?,grey_qty=?,rate=? WHERE jpo_id=?',
        [finish_qty||0,grey_qty||0,rate||0,req.params.id]);
    }
    await conn.commit();
    res.json({success:true,message:'JPO updated'});
  }catch(e){await conn.rollback();console.error(e);res.status(500).json({success:false,message:e.message||'Server error'});}
  finally{conn.release();}
};

exports.getAll = async (req,res) => {
  try{
    const page        = Math.max(1,parseInt(req.query.page)||1);
    const limit       = Math.min(100,parseInt(req.query.limit)||10);
    const offset      = (page-1)*limit;
    const date_from   = (req.query.date_from||'').trim();
    const date_to     = (req.query.date_to||'').trim();
    const jpo_number  = (req.query.jpo_number||'').trim();
    const jobworker   = (req.query.jobworker_name||'').trim();
    const cpo_no      = (req.query.cpo_no||'').trim();
    const quality     = (req.query.quality||'').trim();
    const process_type= (req.query.process_type||'').trim();

    let conditions=['j.is_active=1'], params=[];
    if(date_from)   { conditions.push('j.jpo_date >= ?');         params.push(date_from); }
    if(date_to)     { conditions.push('j.jpo_date <= ?');         params.push(date_to); }
    if(jpo_number)  { conditions.push('j.jpo_number LIKE ?');     params.push(`%${jpo_number}%`); }
    if(jobworker)   { conditions.push('j.jobworker_name LIKE ?'); params.push(`%${jobworker}%`); }
    if(cpo_no)      { conditions.push('j.cpo_no LIKE ?');         params.push(`%${cpo_no}%`); }
    if(quality)     { conditions.push('cs.quality LIKE ?');       params.push(`%${quality}%`); }
    if(process_type){ conditions.push('j.process_type LIKE ?');   params.push(`%${process_type}%`); }

    const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
    const [rows]=await db.execute(
      `SELECT j.*,cs.quality,cs.color,cs.width,cs.fabric_type,cs.gsm,
              js.grey_qty AS sku_grey_qty,js.finish_qty AS sku_finish_qty,
              co.customer_name,co.selling_firm,co.merchant AS cpo_merchant
       FROM jpo_orders j JOIN jpo_skus js ON js.jpo_id=j.id JOIN cpo_skus cs ON cs.id=js.sku_id JOIN cpo_orders co ON co.id=j.cpo_id
       ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params,limit,offset]
    );
    const [[{total}]]=await db.execute(
      `SELECT COUNT(*) AS total FROM jpo_orders j
       JOIN jpo_skus js ON js.jpo_id=j.id JOIN cpo_skus cs ON cs.id=js.sku_id
       ${where}`, params
    );
    res.json({success:true,data:rows,total,page,limit,pages:Math.ceil(total/limit)});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.getOne = async (req,res) => {
  try{
    const [rows]=await db.execute(
      `SELECT j.*,co.customer_name,co.selling_firm,co.followup_person FROM jpo_orders j
       JOIN cpo_orders co ON co.id=j.cpo_id WHERE j.id=? AND j.is_active=1`,[req.params.id]
    );
    if(!rows.length) return res.status(404).json({success:false,message:'Not found'});
    const [skus]=await db.execute(
      `SELECT js.*,cs.quality,cs.color,cs.fabric_type,cs.width,cs.gsm
       FROM jpo_skus js JOIN cpo_skus cs ON cs.id=js.sku_id WHERE js.jpo_id=?`,[req.params.id]
    );
    res.json({success:true,data:{...rows[0],skus}});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.remove = async (req,res) => {
  try{await db.execute('UPDATE jpo_orders SET is_active=0 WHERE id=?',[req.params.id]);res.json({success:true});}
  catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

exports.getPDF = async (req,res) => {
  try{
    const [rows]=await db.execute(
      `SELECT j.*,co.customer_name,co.selling_firm,co.followup_person FROM jpo_orders j
       JOIN cpo_orders co ON co.id=j.cpo_id WHERE j.id=? AND j.is_active=1`,[req.params.id]
    );
    if(!rows.length) return res.status(404).json({success:false,message:'Not found'});
    const jpo=rows[0];
    const [skus]=await db.execute(
      `SELECT js.*,cs.quality,cs.color,cs.fabric_type,cs.width,cs.gsm
       FROM jpo_skus js JOIN cpo_skus cs ON cs.id=js.sku_id WHERE js.jpo_id=?`,[req.params.id]
    );
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(buildJPOPDF(jpo,skus));
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Server error'});}
};

function buildJPOPDF(jpo,skus){
  const firmName=jpo.selling_firm||'AJANTHA SILK MILLS PVT LTD';
  const skuRows=skus.map((s,i)=>`
    <tr>
      <td class="tc">${i+1}</td>
      <td><strong>${s.quality||'—'}</strong></td>
      <td class="tc">${jpo.process_type||'—'}</td>
      <td class="tc">${s.color||'—'}</td>
      <td class="tc">${s.width||'—'}"</td>
      <td class="tr"><strong>${Number(s.finish_qty||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
      <td class="tr"><strong>${Number(s.grey_qty||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
    </tr>`).join('');
  const genDate=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>JPO — ${jpo.jpo_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#f0f2f5}
.no-print{background:#b91c1c;color:#fff;text-align:center;padding:12px 20px;position:sticky;top:0;z-index:99;display:flex;align-items:center;justify-content:center;gap:16px;font-size:13px}
.no-print button{background:#fff;color:#b91c1c;border:none;padding:8px 24px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer}
.no-print button:hover{background:#fee2e2}
.page{max-width:750px;margin:20px auto;background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.12);overflow:hidden}
.hdr{background:linear-gradient(135deg,#1a1a1a 0%,#3d0000 50%,#7f1d1d 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}
.co-name{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px}
.co-sub{font-size:10px;color:rgba(255,255,255,.7);margin-top:3px}
.co-addr{font-size:10px;color:rgba(255,255,255,.55);margin-top:5px;line-height:1.5}
.doc-badge{text-align:right}
.doc-type{font-size:10px;font-weight:700;color:rgba(255,255,255,.65);letter-spacing:3px;text-transform:uppercase}
.doc-no{font-size:20px;font-weight:900;color:#fca5a5;margin-top:4px}
.doc-date{font-size:10px;color:rgba(255,255,255,.55);margin-top:3px}
.body{padding:24px 32px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
.info-box{background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:12px 14px}
.info-box .title{font-size:9px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
.info-row{display:flex;justify-content:space-between;margin-bottom:4px}
.info-row:last-child{margin-bottom:0}
.info-k{font-size:10px;color:#9ca3af}
.info-v{font-size:11px;font-weight:600;color:#1a1a2e;text-align:right}
.info-v.hi{color:#b91c1c;font-weight:700}
.sec-title{font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #fecaca}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
thead tr{background:linear-gradient(90deg,#7f1d1d,#b91c1c)}
th{padding:9px 10px;color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:left}
td{padding:8px 10px;border-bottom:1px solid #fef2f2}
tr:nth-child(even) td{background:#fff5f5}
tr:last-child td{border-bottom:none}
.tc{text-align:center}.tr{text-align:right}
.terms{background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:12px 14px;margin-bottom:20px}
.terms .title{font-size:9px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
.terms ol{padding-left:16px}
.terms li{font-size:10px;margin-bottom:3px;color:#444;line-height:1.5}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding-top:20px;border-top:2px dashed #fecaca}
.sig-box{text-align:center}
.sig-line{border-top:1.5px solid #fca5a5;margin-top:36px;padding-top:6px}
.sig-name{font-size:10px;font-weight:700;color:#b91c1c}
.sig-sub{font-size:9px;color:#9ca3af;margin-top:2px}
.footer{background:#fff5f5;border-top:1px solid #fecaca;padding:10px 32px;text-align:center;font-size:9px;color:#aaa;margin-top:20px}
@media print{.no-print{display:none!important}.page{box-shadow:none;margin:0;border-radius:0}body{background:#fff}}
</style></head><body>
<div class="no-print">
  <span>📄 JPO: <strong>${jpo.jpo_number}</strong> — Review document below, then print</span>
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="page">
  <div class="hdr">
    <div>
      <div class="co-name">${firmName}</div>
      <div class="co-sub">Textile Merchants &amp; Processors | GST: 24AARCA9664Q1ZM</div>
      <div class="co-addr">Radha Krishna Logistics Park, A-4004/4003, Behind Bharat Cancer Hospital<br>Saroli, Surat — Gujarat 395010</div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Jobwork Purchase Order</div>
      <div class="doc-no">${jpo.jpo_number}</div>
      <div class="doc-date">Generated: ${genDate}</div>
    </div>
  </div>
  <div class="body">
    <div class="grid3">
      <div class="info-box">
        <div class="title">📋 Order Details</div>
        <div class="info-row"><span class="info-k">JPO Number</span><span class="info-v hi">${jpo.jpo_number}</span></div>
        <div class="info-row"><span class="info-k">JPO Date</span><span class="info-v">${fmtD(jpo.jpo_date)}</span></div>
        <div class="info-row"><span class="info-k">Delivery</span><span class="info-v">${fmtD(jpo.delivery_date)}</span></div>
        <div class="info-row"><span class="info-k">Customer Order</span><span class="info-v hi">${jpo.cpo_no||'—'}</span></div>
        <div class="info-row"><span class="info-k">Selling Firm</span><span class="info-v">${firmName}</span></div>
      </div>
      <div class="info-box">
        <div class="title">🏭 Jobworker / Mill</div>
        <div class="info-row"><span class="info-k">Mill Name</span><span class="info-v hi">${jpo.jobworker_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Quality</span><span class="info-v">${skus[0]?.quality||'—'}</span></div>
        <div class="info-row"><span class="info-k">Process</span><span class="info-v">${jpo.process_type||'—'}</span></div>
        <div class="info-row"><span class="info-k">Width</span><span class="info-v">${skus[0]?.width||'—'}"</span></div>
        <div class="info-row"><span class="info-k">Rate</span><span class="info-v hi">₹${Number(jpo.rate||0).toFixed(2)}/m</span></div>
      </div>
      <div class="info-box">
        <div class="title">🏷️ Order Reference</div>
        <div class="info-row"><span class="info-k">Customer</span><span class="info-v">${jpo.customer_name||'—'}</span></div>
        <div class="info-row"><span class="info-k">Followup</span><span class="info-v">${jpo.followup_person||'—'}</span></div>
        <div class="info-row"><span class="info-k">Color</span><span class="info-v hi">${skus[0]?.color||'—'}</span></div>
        <div class="info-row"><span class="info-k">Fabric</span><span class="info-v">${skus[0]?.fabric_type||'—'}</span></div>
      </div>
    </div>
    ${jpo.notes?`<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:16px"><div style="font-size:9px;font-weight:700;color:#ef4444;text-transform:uppercase;margin-bottom:3px">✏️ Special Instructions</div>${jpo.notes}</div>`:''}
    <div class="sec-title">⚙️ Jobwork Items</div>
    <table>
      <thead><tr><th class="tc">#</th><th>Quality / Description</th><th class="tc">Process</th><th class="tc">Color</th><th class="tc">Width</th><th class="tr">Finish Qty (m)</th><th class="tr">Grey Qty (m)</th></tr></thead>
      <tbody>${skuRows}</tbody>
    </table>
    <div class="terms">
      <div class="title">📜 Terms &amp; Conditions</div>
      <ol>
        <li>Quality and shade as per approved sample.</li>
        <li>Delivery strictly on or before the mentioned date.</li>
        <li>GSM, shrinkage and finish as per buyer specification.</li>
        <li>Any defect or rejection will be at the jobworker's account.</li>
        <li>Payment will be processed after delivery and quality approval.</li>
      </ol>
    </div>
    <div class="sigs">
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Prepared By</div><div class="sig-sub">Name &amp; Stamp</div></div></div>
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Mill / Jobworker</div><div class="sig-sub">Accepted &amp; Signed</div></div></div>
      <div class="sig-box"><div class="sig-line"><div class="sig-name">Authorised Signatory</div><div class="sig-sub">Ajantha Silk Mills</div></div></div>
    </div>
  </div>
  <div class="footer">This is a computer-generated document. | Ajantha Silk Mills Pvt Ltd, Surat | JPO: ${jpo.jpo_number} | ${genDate}</div>
</div>
</body></html>`;
}
