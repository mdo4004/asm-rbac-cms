/**
 * CustomerPOForm.jsx
 * Permission-aware: respects can_view / can_add / can_edit / can_delete
 */
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import FilterPanel from '../../components/common/FilterPanel';

const TODAY = new Date().toISOString().split('T')[0];
const FABRIC_TYPES = ['— Select —','Solid','Printed','Embroidered','Jacquard','Dobby','Yarn Dyed'];
const WIDTHS = ['— Select —','36','44','48','54','56','58','60','63','72'];
const blankSKU = () => ({ _id:Math.random(), quality:'', color:'', fabric_type:'', width:'', gsm:'', finish_qty:'', grey_qty:'', rate:'' });
const fmtDate  = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };

const CPO_FILTER_CONFIG = [
  { key:'date',          label:'PO Date',        type:'date-range' },
  { key:'order_no',      label:'Order No',        type:'text', placeholder:'e.g. AS/2026/0001' },
  { key:'customer_name', label:'Customer Name',   type:'text' },
  { key:'selling_firm',  label:'Selling Firm',    type:'text' },
  { key:'merchant',      label:'Merchant',        type:'text' },
];
const cpoFiltersToParams = (vals) => {
  const p = {};
  Object.entries(vals).forEach(([k, v]) => {
    if (!v) return;
    if (k.endsWith('_from')) p['date_from'] = v;
    else if (k.endsWith('_to')) p['date_to'] = v;
    else p[k] = v;
  });
  return p;
};
const countActive = (vals) => Object.values(vals).filter(v => v && v !== '').length;

export default function CustomerPOForm() {
  const { hasPermission, user } = useAuth();
  // Admins always have full access; employees use orders_cpo permissions
  const modKey   = user?.role === 'admin' ? null : 'orders_cpo';
  const canAdd   = modKey ? hasPermission(modKey, 'add')    : true;
  const canEdit  = modKey ? hasPermission(modKey, 'edit')   : true;
  const canDel   = modKey ? hasPermission(modKey, 'delete') : true;

  const [master,     setMaster]     = useState({});
  const [firms,      setFirms]      = useState([]);
  const [form,       setForm]       = useState({ selling_firm:'', firm_prefix:'', customer_name:'', followup_person:'', merchant:'', mill_name:'', weaver_name:'', po_date:TODAY, delivery_date:TODAY });
  const [orderNo,    setOrderNo]    = useState('');
  const [skus,       setSkus]       = useState([blankSKU(), blankSKU(), blankSKU()]);
  const [loading,    setLoading]    = useState(false);
  const [genLoad,    setGenLoad]    = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [weaverInput, setWeaverInput] = useState('');
  const [weaverSugg,  setWeaverSugg]  = useState([]);
  const [showWeaver,  setShowWeaver]  = useState(false);
  const [recentCPOs,  setRecentCPOs]  = useState([]);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [showForm,    setShowForm]    = useState(false);
  const [filterVals,  setFilterVals]  = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    api.get('/master/all').then(r => { setMaster(r.data.data||{}); setFirms(r.data.data?.firms||[]); }).catch(()=>{});
    loadRecent(1);
  }, []);

  const loadRecent = (p=1, filters=appliedFilters) => {
    const fp = cpoFiltersToParams(filters);
    api.get('/orders/cpo', { params: { limit:10, page:p, ...fp } }).then(r => {
      setRecentCPOs(r.data.data||[]); setTotalPages(r.data.pages||1); setPage(p);
    }).catch(()=>{});
  };

  const handleFilterChange = (f, v) => setFilterVals(p => ({ ...p, [f]: v }));
  const handleFilterApply  = () => { const nf={...filterVals}; setAppliedFilters(nf); loadRecent(1, nf); };
  const handleFilterReset  = () => { setFilterVals({}); setAppliedFilters({}); loadRecent(1, {}); };

  const handleEdit = async (id) => {
    if (!canEdit) return toast.error('No edit permission');
    try {
      const r = await api.get(`/orders/cpo/${id}`);
      const d = r.data.data;
      setEditId(id); setShowForm(true);
      setOrderNo(d.order_no);
      setWeaverInput(d.weaver_name||'');
      setForm({
        selling_firm:d.selling_firm||'', firm_prefix:d.firm_prefix||'',
        customer_name:d.customer_name||'', followup_person:d.followup_person||'',
        merchant:d.merchant||'', mill_name:d.mill_name||'',
        weaver_name:d.weaver_name||'',
        po_date:d.po_date?.split('T')[0]||TODAY,
        delivery_date:d.delivery_date?.split('T')[0]||TODAY,
      });
      setSkus((d.skus||[]).map(s=>({...s,_id:Math.random()})));
      window.scrollTo({top:0,behavior:'smooth'});
    } catch { toast.error('Failed to load CPO'); }
  };

  const cancelEdit = () => {
    setEditId(null); setShowForm(false); setOrderNo(''); setWeaverInput('');
    setForm({selling_firm:'',firm_prefix:'',customer_name:'',followup_person:'',merchant:'',mill_name:'',weaver_name:'',po_date:TODAY,delivery_date:TODAY});
    setSkus([blankSKU(),blankSKU(),blankSKU()]);
  };

  const handleWeaverInput = (val) => {
    setWeaverInput(val); setForm(p=>({...p,weaver_name:val}));
    if(val.length>0){
      const pool=[...(master.mills||[]),...(master.buyers||[])];
      setWeaverSugg(pool.filter(x=>x.name?.toLowerCase().includes(val.toLowerCase())).slice(0,6));
      setShowWeaver(true);
    } else setShowWeaver(false);
  };

  const handleFirmChange = (e) => {
    if(editId) return;
    const firmName=e.target.value;
    const firm=firms.find(f=>f.name===firmName);
    setForm(p=>({...p,selling_firm:firmName,firm_prefix:firm?.prefix||''}));
    setOrderNo('');
  };

  const handleGenerateNo = async () => {
    if(!form.firm_prefix) return toast.warning('Select a selling firm first');
    setGenLoad(true);
    try {
      const r=await api.get(`/orders/cpo/preview-no?prefix=${form.firm_prefix}`);
      setOrderNo(r.data.preview);
    } catch { toast.error('Could not generate order number'); }
    finally { setGenLoad(false); }
  };

  const addSKU    = () => setSkus(p=>[...p,blankSKU()]);
  const removeSKU = (id) => setSkus(p=>p.filter(s=>s._id!==id));
  const updateSKU = (id,field,val) => setSkus(p=>p.map(s=>s._id===id?{...s,[field]:val}:s));
  const totalFinish = skus.reduce((s,r)=>s+(parseFloat(r.finish_qty)||0),0);
  const totalGrey   = skus.reduce((s,r)=>s+(parseFloat(r.grey_qty)||0),0);

  const handleSubmit = async () => {
    if(!form.selling_firm)  return toast.error('Select a selling firm');
    if(!form.customer_name) return toast.error('Enter customer name');
    if(!form.po_date)       return toast.error('Select PO date');
    if(!form.delivery_date) return toast.error('Select delivery date');
    const validSkus=skus.filter(s=>s.quality.trim());
    if(!validSkus.length)   return toast.error('Add at least one SKU with Quality');
    setLoading(true);
    try {
      const payload={...form,skus:validSkus.map(({_id,...rest})=>rest)};
      if(editId){
        await api.put(`/orders/cpo/${editId}`,payload);
        toast.success(`✅ CPO Updated: ${orderNo}`);
        cancelEdit();
      } else {
        const r=await api.post('/orders/cpo',payload);
        toast.success(`✅ CPO Saved: ${r.data.order_no}`);
        cancelEdit();
      }
      loadRecent(1);
    } catch(err){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setLoading(false); }
  };

  const openPDF   = (id) => {
    const base = import.meta.env.VITE_API_URL || '/api';
    window.open(`${base}/orders/cpo/${id}/pdf`, '_blank');
  };
  const deleteCPO = async (id) => {
    if(!canDel) return toast.error('No delete permission');
    if(!confirm('Delete this CPO?')) return;
    try{ await api.delete(`/orders/cpo/${id}`); toast.success('Deleted'); loadRecent(page); }
    catch{ toast.error('Delete failed'); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <div>
            <h1 className="text-xl font-black text-gray-800">
              Customer <span className="text-indigo-600">PO Entry</span>
              {editId && <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">✏️ Editing: {orderNo}</span>}
            </h1>
            {!canAdd && !editId && <p className="text-xs text-orange-500 mt-0.5">👁 View only — no create permission</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {canAdd && !showForm && !editId && (
            <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">+ New CPO</button>
          )}
          {(showForm||editId) && <button onClick={cancelEdit} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-semibold">✕ Cancel</button>}
        </div>
      </div>

      {/* CREATE / EDIT FORM — only shown when canAdd or canEdit */}
      {(showForm || editId) && (canAdd || canEdit) && (
        <div className={`bg-white rounded-2xl border shadow-sm p-6 mb-5 ${editId?'border-amber-300':'border-indigo-200'}`}>
          {/* Firm + Order No */}
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="form-label">SELLING FIRM *</label>
              <select className="form-input" value={form.selling_firm} onChange={handleFirmChange} disabled={!!editId}>
                <option value="">— Select Firm —</option>
                {firms.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            {!editId && (
              <button onClick={handleGenerateNo} disabled={genLoad||!form.firm_prefix}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                {genLoad?'…':'🔢'} Generate Order No
              </button>
            )}
            <div className={`min-w-[155px] border-2 rounded-lg px-4 py-2 text-sm font-bold text-center ${orderNo?'border-indigo-500 text-indigo-700 bg-indigo-50':'border-gray-200 text-gray-400 bg-gray-50'}`}>
              {orderNo||`${form.firm_prefix||'??'}/YYYY/—`}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="form-label">PO DATE *</label><input type="date" className="form-input" value={form.po_date} onChange={e=>setForm(p=>({...p,po_date:e.target.value}))}/></div>
            <div><label className="form-label">CUSTOMER *</label>
              <input type="text" className="form-input" placeholder="Type or select…" list="cust-list" value={form.customer_name} onChange={e=>setForm(p=>({...p,customer_name:e.target.value}))}/>
              <datalist id="cust-list">{(master.customers||[]).map(c=><option key={c.id} value={c.name}/>)}</datalist></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="form-label">DELIVERY DATE *</label><input type="date" className="form-input" value={form.delivery_date} onChange={e=>setForm(p=>({...p,delivery_date:e.target.value}))}/></div>
            <div><label className="form-label">FOLLOWUPER</label>
              <select className="form-input" value={form.followup_person} onChange={e=>setForm(p=>({...p,followup_person:e.target.value}))}>
                <option value="">— Select —</option>
                {(master.followups||[]).map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="form-label">MERCHANT</label>
              <select className="form-input" value={form.merchant} onChange={e=>setForm(p=>({...p,merchant:e.target.value}))}>
                <option value="">— Select —</option>
                {(master.merchants||[]).map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
              </select></div>
            <div><label className="form-label">MILL NAME</label>
              <select className="form-input" value={form.mill_name} onChange={e=>setForm(p=>({...p,mill_name:e.target.value}))}>
                <option value="">— Select Mill —</option>
                {(master.mills||[]).map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
              </select></div>
          </div>
          <div className="mb-5 relative">
            <label className="form-label">WEAVER NAME</label>
            <input type="text" className="form-input" placeholder="Type or select weaver…" value={weaverInput}
              onChange={e=>handleWeaverInput(e.target.value)} onBlur={()=>setTimeout(()=>setShowWeaver(false),150)}/>
            {showWeaver&&weaverSugg.length>0&&(
              <div className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-36 overflow-y-auto left-0 right-0">
                {weaverSugg.map(s=><div key={s.id} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                  onMouseDown={()=>{setWeaverInput(s.name);setForm(p=>({...p,weaver_name:s.name}));setShowWeaver(false);}}>{s.name}</div>)}
              </div>
            )}
          </div>

          {/* SKU Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
              <span className="text-sm font-bold text-gray-700">📦 SKU / Line Items</span>
              <button onClick={addSKU} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">+ Add SKU</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="px-2 py-2 text-center w-7">#</th>
                  <th className="px-2 py-2 text-left">QUALITY *</th><th className="px-2 py-2 text-left">COLOR</th>
                  <th className="px-2 py-2 text-left">FABRIC</th><th className="px-2 py-2 text-left">WIDTH</th>
                  <th className="px-2 py-2 text-left">GSM</th><th className="px-2 py-2 text-left">FINISH QTY</th>
                  <th className="px-2 py-2 text-left">GREY QTY</th><th className="px-2 py-2 text-left">RATE ₹/m</th>
                  <th className="px-2 py-2 w-6"></th>
                </tr></thead>
                <tbody>
                  {skus.map((sku,idx)=>(
                    <tr key={sku._id} className="border-b border-gray-100 hover:bg-indigo-50/20">
                      <td className="px-2 py-1.5 text-center text-gray-400 font-semibold">{idx+1}</td>
                      <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="Quality…" value={sku.quality} list={`ql-${sku._id}`} onChange={e=>updateSKU(sku._id,'quality',e.target.value)}/><datalist id={`ql-${sku._id}`}>{(master.qualities||[]).map(q=><option key={q.id} value={q.name}/>)}</datalist></td>
                      <td className="px-1 py-1"><input className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="RED" value={sku.color} onChange={e=>updateSKU(sku._id,'color',e.target.value)}/></td>
                      <td className="px-1 py-1"><select className="border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none" value={sku.fabric_type} onChange={e=>updateSKU(sku._id,'fabric_type',e.target.value)}>{FABRIC_TYPES.map(f=><option key={f}>{f}</option>)}</select></td>
                      <td className="px-1 py-1"><select className="border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none" value={sku.width} onChange={e=>updateSKU(sku._id,'width',e.target.value)}>{WIDTHS.map(w=><option key={w}>{w}</option>)}</select></td>
                      <td className="px-1 py-1"><input className="w-14 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" placeholder="GSM" value={sku.gsm} onChange={e=>updateSKU(sku._id,'gsm',e.target.value)}/></td>
                      <td className="px-1 py-1"><input type="number" className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="0.00" value={sku.finish_qty} min="0" step="0.01" onChange={e=>updateSKU(sku._id,'finish_qty',e.target.value)}/></td>
                      <td className="px-1 py-1"><input type="number" className="w-20 border border-amber-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none bg-amber-50" placeholder="Auto" value={sku.grey_qty} min="0" step="0.01" onChange={e=>updateSKU(sku._id,'grey_qty',e.target.value)}/></td>
                      <td className="px-1 py-1"><input type="number" className="w-16 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="₹/m" value={sku.rate} min="0" onChange={e=>updateSKU(sku._id,'rate',e.target.value)}/></td>
                      <td className="px-1 py-1 text-center"><button onClick={()=>removeSKU(sku._id)} className="text-red-400 hover:text-red-600 font-bold">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-6 px-4 py-2 bg-indigo-50 border-t border-indigo-100 text-sm">
              <span className="text-gray-500">SKUs: <strong className="text-indigo-700">{skus.length}</strong></span>
              <span className="text-gray-500">Total Finish: <strong className="text-indigo-700">{totalFinish.toFixed(2)} m</strong></span>
              <span className="text-gray-500">Total Grey: <strong className="text-green-700">{totalGrey.toFixed(2)} m</strong></span>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className={`w-full py-3 text-white font-bold rounded-xl text-base transition disabled:opacity-50 ${editId?'bg-amber-500 hover:bg-amber-600':'bg-indigo-600 hover:bg-indigo-700'}`}>
            {loading?'⏳ Saving…': editId?`💾 Update CPO: ${orderNo}`:'💾 Save Customer PO'}
          </button>
          {!editId && <p className="text-center text-xs text-gray-400 mt-2">After saving, use the 📄 PDF button in the list below</p>}
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">
            📋 Customer PO Records
            {countActive(appliedFilters) > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {countActive(appliedFilters)} {countActive(appliedFilters)>1?"filters":"filter"} active
              </span>
            )}
          </h2>
          <button onClick={()=>loadRecent(1)} className="text-xs text-blue-600 hover:underline">↻ Refresh</button>
        </div>
        <FilterPanel config={CPO_FILTER_CONFIG} values={filterVals} onChange={handleFilterChange}
          onApply={handleFilterApply} onReset={handleFilterReset} activeCount={countActive(appliedFilters)} />
        {recentCPOs.length===0 ? <p className="text-sm text-gray-400 text-center py-6">No orders yet</p> : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-th">Order No</th>
                <th className="table-th">PO Date</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Selling Firm</th>
                <th className="table-th">Delivery</th>
                <th className="table-th">Merchant</th>
                <th className="table-th">Mill</th>
                <th className="table-th text-center">SKUs</th>
                <th className="table-th text-center">Actions</th>
              </tr></thead>
              <tbody>
                {recentCPOs.map(c=>(
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-mono font-bold text-indigo-700">{c.order_no}</td>
                    <td className="table-td whitespace-nowrap">{fmtDate(c.po_date)}</td>
                    <td className="table-td font-medium max-w-[120px] truncate">{c.customer_name||'—'}</td>
                    <td className="table-td text-gray-600 max-w-[100px] truncate">{c.selling_firm||'—'}</td>
                    <td className="table-td whitespace-nowrap text-orange-600">{fmtDate(c.delivery_date)}</td>
                    <td className="table-td text-gray-500">{c.merchant||'—'}</td>
                    <td className="table-td text-gray-500 max-w-[90px] truncate">{c.mill_name||'—'}</td>
                    <td className="table-td text-center"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{c.sku_count||0}</span></td>
                    <td className="table-td">
                      <div className="flex gap-1 justify-center">
                        {canEdit && <button onClick={()=>handleEdit(c.id)} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold hover:bg-amber-200">✏️</button>}
                        <button onClick={()=>openPDF(c.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-semibold hover:bg-blue-700">📄 PDF</button>
                        {canDel && <button onClick={()=>deleteCPO(c.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-semibold hover:bg-red-200">🗑</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages>1&&(
            <div className="flex justify-center gap-2 mt-3">
              <button disabled={page<=1} onClick={()=>loadRecent(page-1)} className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-40">‹ Prev</button>
              <span className="px-3 py-1 text-xs text-gray-500">Page {page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=>loadRecent(page+1)} className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-40">Next ›</button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
