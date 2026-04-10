import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import FilterPanel from '../../components/common/FilterPanel';

const TODAY = new Date().toISOString().split('T')[0];
const fmtDate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };

const SPO_FILTER_CONFIG = [
  { key:'date',          label:'SPO Date',        type:'date-range' },
  { key:'spo_number',    label:'SPO Number',      type:'text', placeholder:'e.g. SPO/2026/0001' },
  { key:'supplier_name', label:'Supplier Name',   type:'text' },
  { key:'cpo_no',        label:'CPO Number',      type:'text' },
  { key:'quality',       label:'Quality',         type:'text' },
];
const spoFiltersToParams = (vals) => {
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

export default function SupplierPO() {
  const { hasPermission, user } = useAuth();
  const modKey  = user?.role === 'admin' ? null : 'orders_spo';
  const canAdd  = modKey ? hasPermission(modKey, 'add')    : true;
  const canEdit = modKey ? hasPermission(modKey, 'edit')   : true;
  const canDel  = modKey ? hasPermission(modKey, 'delete') : true;

  const [master,      setMaster]      = useState({});
  const [cpoInput,    setCpoInput]    = useState('');
  const [fetching,    setFetching]    = useState(false);
  const [fetchMsg,    setFetchMsg]    = useState('');
  const [cpoData,     setCpoData]     = useState(null);
  const [skus,        setSkus]        = useState([]);
  const [selected,    setSelected]    = useState({});
  const [spoForm,     setSpoForm]     = useState({ supplier_name:'', spo_date:TODAY, delivery_date:TODAY, rate:'', merchant:'', notes:'' });
  const [editId,      setEditId]      = useState(null);
  const [editGreyQty, setEditGreyQty] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [createdSPOs, setCreatedSPOs] = useState([]);
  const [recentSPOs,  setRecentSPOs]  = useState([]);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [filterVals,     setFilterVals]     = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    api.get('/master/all').then(r=>setMaster(r.data.data||{})).catch(()=>{});
    loadRecent(1);
  }, []);

  const loadRecent = (p=1, filters=appliedFilters) => {
    const fp = spoFiltersToParams(filters);
    api.get('/orders/spo', { params: { limit:10, page:p, ...fp } }).then(r=>{
      setRecentSPOs(r.data.data||[]); setTotalPages(r.data.pages||1); setPage(p);
    }).catch(()=>{});
  };

  const handleFilterChange = (f, v) => setFilterVals(p => ({ ...p, [f]: v }));
  const handleFilterApply  = () => { const nf={...filterVals}; setAppliedFilters(nf); loadRecent(1, nf); };
  const handleFilterReset  = () => { setFilterVals({}); setAppliedFilters({}); loadRecent(1, {}); };

  const handleEdit = async (id) => {
    if(!canEdit) return toast.error('No edit permission');
    try {
      const r=await api.get(`/orders/spo/${id}`);
      const d=r.data.data;
      setEditId(id);
      setSpoForm({ supplier_name:d.supplier_name||'', spo_date:d.spo_date?.split('T')[0]||TODAY, delivery_date:d.delivery_date?.split('T')[0]||TODAY, rate:d.rate||'', merchant:d.merchant||'', notes:d.notes||'' });
      if(d.skus?.length) setEditGreyQty(String(d.skus[0].grey_qty||0));
      window.scrollTo({top:0,behavior:'smooth'});
      toast.info(`Editing: ${d.spo_number}`);
    } catch { toast.error('Failed to load SPO'); }
  };

  const cancelEdit = () => { setEditId(null); setEditGreyQty(''); setSpoForm({supplier_name:'',spo_date:TODAY,delivery_date:TODAY,rate:'',merchant:'',notes:''}); };

  const fetchCPO = async () => {
    if(!canAdd) return toast.error('No add permission');
    const no=cpoInput.trim().toUpperCase();
    if(!no) return toast.warning('Enter a CPO number');
    setFetching(true); setFetchMsg(''); setCpoData(null); setSkus([]); setCreatedSPOs([]);
    try {
      const r=await api.get(`/orders/spo/fetch-cpo?no=${encodeURIComponent(no)}`);
      setCpoData(r.data.cpo);
      const skuList=r.data.skus||[];
      setSkus(skuList);
      const sel={}; skuList.forEach(s=>{sel[s.id]={checked:true,grey_qty:s.grey_qty||0};});
      setSelected(sel);
      setSpoForm(p=>({...p,merchant:r.data.cpo.merchant||'',delivery_date:r.data.cpo.delivery_date?.split('T')[0]||TODAY}));
      setFetchMsg(`✅ Found ${skuList.length} SKU${skuList.length!==1?'s':''} for ${no} — ${r.data.cpo.customer_name}`);
    } catch(err){ setFetchMsg(`❌ ${err.response?.data?.message||'CPO not found'}`); }
    finally{ setFetching(false); }
  };

  const toggleAll=(val)=>{ const sel={}; skus.forEach(s=>{sel[s.id]={...selected[s.id],checked:val};}); setSelected(sel); };
  const selectedList=skus.filter(s=>selected[s.id]?.checked);

  const handleSubmit = async () => {
    if(editId){
      if(!spoForm.supplier_name) return toast.error('Enter supplier name');
      setSubmitting(true);
      try { await api.put(`/orders/spo/${editId}`,{...spoForm,rate:parseFloat(spoForm.rate)||0,grey_qty:parseFloat(editGreyQty)||0}); toast.success('✅ SPO Updated!'); cancelEdit(); loadRecent(1); }
      catch(err){ toast.error(err.response?.data?.message||'Update failed'); }
      finally{ setSubmitting(false); }
      return;
    }
    if(!selectedList.length)   return toast.error('Select at least one SKU');
    if(!spoForm.supplier_name) return toast.error('Enter supplier name');
    setSubmitting(true);
    try {
      const r=await api.post('/orders/spo',{cpo_id:cpoData.id,cpo_no:cpoData.order_no,...spoForm,rate:parseFloat(spoForm.rate)||0,selected_skus:selectedList.map(s=>({sku_id:s.id,grey_qty:parseFloat(selected[s.id]?.grey_qty)||0}))});
      setCreatedSPOs(r.data.created);
      toast.success(`✅ Created ${r.data.created.length} SPO(s)!`);
      setCpoInput(''); setCpoData(null); setSkus([]); setSelected({});
      setSpoForm({supplier_name:'',spo_date:TODAY,delivery_date:TODAY,rate:'',merchant:'',notes:''}); setFetchMsg(''); loadRecent(1);
    } catch(err){ toast.error(err.response?.data?.message||'Failed'); }
    finally{ setSubmitting(false); }
  };

  const openPDF = (id) => {
    const base = import.meta.env.VITE_API_URL || '/api';
    window.open(`${base}/orders/spo/${id}/pdf`, '_blank');
  };
  const deleteSPO=async(id)=>{ if(!canDel) return toast.error('No delete permission'); if(!confirm('Delete?')) return; try{await api.delete(`/orders/spo/${id}`);toast.success('Deleted');loadRecent(page);}catch{toast.error('Delete failed');} };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <div>
            <h1 className="text-xl font-black text-gray-800">Supplier <span className="text-emerald-600">Purchase Order</span></h1>
            {!canAdd && <p className="text-xs text-orange-500 mt-0.5">👁 View only — no create permission</p>}
          </div>
        </div>
        {editId && <button onClick={cancelEdit} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-semibold">✕ Cancel Edit</button>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
        {/* Edit mode */}
        {editId && canEdit ? (
          <div>
            <div className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">✏️ EDIT SPO</div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><label className="form-label">SPO DATE *</label><input type="date" className="form-input" value={spoForm.spo_date} onChange={e=>setSpoForm(p=>({...p,spo_date:e.target.value}))}/></div>
              <div><label className="form-label">SUPPLIER *</label><input type="text" className="form-input" value={spoForm.supplier_name} onChange={e=>setSpoForm(p=>({...p,supplier_name:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><label className="form-label">RATE (₹/MTR)</label><input type="number" className="form-input" value={spoForm.rate} onChange={e=>setSpoForm(p=>({...p,rate:e.target.value}))}/></div>
              <div><label className="form-label">GREY QTY (m)</label><input type="number" className="form-input bg-emerald-50 border-emerald-300" value={editGreyQty} onChange={e=>setEditGreyQty(e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><label className="form-label">DELIVERY DATE</label><input type="date" className="form-input" value={spoForm.delivery_date} onChange={e=>setSpoForm(p=>({...p,delivery_date:e.target.value}))}/></div>
              <div><label className="form-label">MERCHANT</label><input type="text" className="form-input" value={spoForm.merchant} onChange={e=>setSpoForm(p=>({...p,merchant:e.target.value}))}/></div>
            </div>
            <div className="mb-4"><label className="form-label">NOTES</label><textarea className="form-input h-20 resize-none" value={spoForm.notes} onChange={e=>setSpoForm(p=>({...p,notes:e.target.value}))}/></div>
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl">{submitting?'⏳':'💾 Update SPO'}</button>
          </div>
        ) : canAdd ? (
          <>
          {/* Step 1 */}
          <div className="mb-6">
            <div className="inline-block bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">STEP 1 — FETCH CPO</div>
            <div className="flex gap-2">
              <input className="form-input flex-1 font-mono text-sm" placeholder="Enter CPO No (e.g. AS/2026/0001)" value={cpoInput} onChange={e=>setCpoInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&fetchCPO()}/>
              <button onClick={fetchCPO} disabled={fetching} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">{fetching?'⏳':'🔍'} Fetch SKUs</button>
            </div>
            {fetchMsg&&<p className={`text-xs mt-2 font-medium ${fetchMsg.startsWith('✅')?'text-emerald-600':'text-red-500'}`}>{fetchMsg}</p>}
          </div>
          {cpoData&&skus.length>0&&(
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-block bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">STEP 2 — SELECT SKUs</div>
                <div className="flex gap-2"><button onClick={()=>toggleAll(true)} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold">✓ All</button><button onClick={()=>toggleAll(false)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-semibold">✗ None</button></div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs bg-emerald-50 rounded-lg px-3 py-2 mb-3 border border-emerald-100">
                <span>🏭 {cpoData.selling_firm}</span><span>|</span><span>👤 {cpoData.customer_name}</span><span>|</span><span>📅 {fmtDate(cpoData.delivery_date)}</span><span>|</span><span>🛒 {cpoData.merchant||'—'}</span>
              </div>
              <div className="space-y-2">
                {skus.map(s=>{ const sel=selected[s.id]||{}; return (
                  <div key={s.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 text-xs transition-all ${sel.checked?'border-emerald-400 bg-emerald-50':'border-gray-200 bg-gray-50'}`}>
                    <input type="checkbox" checked={!!sel.checked} onChange={e=>setSelected(p=>({...p,[s.id]:{...p[s.id],checked:e.target.checked}}))} className="w-4 h-4 accent-emerald-600"/>
                    <div className="flex-1"><span className="font-semibold text-gray-800">{s.quality}</span>{s.color&&<span className="ml-2 text-gray-500">{s.color}</span>}{s.width&&<span className="ml-2 text-gray-400">{s.width}"</span>}</div>
                    <span className="text-gray-500">Finish: <strong>{s.finish_qty}m</strong></span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[10px] font-semibold">GREY QTY:</span>
                      <input type="number" className="w-20 border border-emerald-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-emerald-400 focus:outline-none bg-white font-semibold" value={sel.grey_qty??s.grey_qty} min="0" step="0.01" onChange={e=>setSelected(p=>({...p,[s.id]:{...p[s.id],grey_qty:e.target.value}}))}/>
                      <span className="text-gray-400">m</span>
                    </div>
                  </div>
                );})}
              </div>
              <p className="text-xs text-gray-500 mt-2">{selectedList.length} selected → <strong className="text-emerald-700">{selectedList.length} SPO{selectedList.length!==1?'s':''}</strong></p>
            </div>
          )}
          {cpoData&&(
            <div>
              <div className="inline-block bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">STEP 3 — SPO DETAILS</div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div><label className="form-label">SPO DATE *</label><input type="date" className="form-input" value={spoForm.spo_date} onChange={e=>setSpoForm(p=>({...p,spo_date:e.target.value}))}/></div>
                <div><label className="form-label">SUPPLIER *</label><input type="text" className="form-input" list="supp-list" value={spoForm.supplier_name} onChange={e=>setSpoForm(p=>({...p,supplier_name:e.target.value}))}/>
                  <datalist id="supp-list">{(master.suppliers||[]).map(s=><option key={s.id} value={s.name}/>)}</datalist></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div><label className="form-label">RATE (₹/MTR)</label><input type="number" className="form-input" value={spoForm.rate} min="0" onChange={e=>setSpoForm(p=>({...p,rate:e.target.value}))}/></div>
                <div><label className="form-label">DELIVERY DATE</label><input type="date" className="form-input" value={spoForm.delivery_date} onChange={e=>setSpoForm(p=>({...p,delivery_date:e.target.value}))}/></div>
              </div>
              <div className="mb-3"><label className="form-label">MERCHANT</label><input type="text" className="form-input" value={spoForm.merchant} onChange={e=>setSpoForm(p=>({...p,merchant:e.target.value}))}/></div>
              <div className="mb-4"><label className="form-label">NOTES / TERMS</label><textarea className="form-input h-20 resize-none" value={spoForm.notes} onChange={e=>setSpoForm(p=>({...p,notes:e.target.value}))}/></div>
              <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-base transition disabled:opacity-50">{submitting?'⏳':'💾 Generate SPO Numbers for Selected SKUs'}</button>
              {createdSPOs.length>0&&(<div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200"><p className="text-sm font-bold text-emerald-700 mb-2">✅ SPOs Created — click to view PDF:</p><div className="flex flex-wrap gap-2">{createdSPOs.map(({spo_id,spo_number})=><button key={spo_id} onClick={()=>openPDF(spo_id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">📄 {spo_number}</button>)}</div></div>)}
            </div>
          )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">👁</div>
            <p className="font-semibold">View Only</p>
            <p className="text-sm">You can view records below but cannot create new SPOs</p>
          </div>
        )}
      </div>

      {/* Records Table — ALL columns */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">
            📋 Supplier PO Records
            {countActive(appliedFilters) > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {countActive(appliedFilters)} {countActive(appliedFilters)>1?"filters":"filter"} active
              </span>
            )}
          </h2>
          <button onClick={()=>loadRecent(1)} className="text-xs text-blue-600 hover:underline">↻ Refresh</button>
        </div>
        <FilterPanel config={SPO_FILTER_CONFIG} values={filterVals} onChange={handleFilterChange}
          onApply={handleFilterApply} onReset={handleFilterReset} activeCount={countActive(appliedFilters)} />
        {recentSPOs.length===0?<p className="text-sm text-gray-400 text-center py-6">No SPOs yet</p>:(
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b">
                <th className="table-th">SPO No</th><th className="table-th">Date</th><th className="table-th">CPO No</th>
                <th className="table-th">Customer</th><th className="table-th">Supplier</th><th className="table-th">Quality</th>
                <th className="table-th">Color</th><th className="table-th">Width</th><th className="table-th">Grey Qty</th>
                <th className="table-th">Rate</th><th className="table-th">Amount</th><th className="table-th">Delivery</th>
                <th className="table-th text-center">Actions</th>
              </tr></thead>
              <tbody>
                {recentSPOs.map(s=>(
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-mono font-bold text-emerald-700">{s.spo_number}</td>
                    <td className="table-td whitespace-nowrap">{fmtDate(s.spo_date)}</td>
                    <td className="table-td"><span className="text-blue-600 font-semibold">{s.cpo_no}</span></td>
                    <td className="table-td max-w-[80px] truncate">{s.customer_name}</td>
                    <td className="table-td font-medium max-w-[90px] truncate">{s.supplier_name}</td>
                    <td className="table-td max-w-[90px] truncate">{s.quality}</td>
                    <td className="table-td">{s.color||'—'}</td>
                    <td className="table-td text-center">{s.width||'—'}"</td>
                    <td className="table-td font-semibold">{Number(s.sku_grey_qty||0).toFixed(2)} m</td>
                    <td className="table-td">₹{Number(s.rate||0).toFixed(0)}</td>
                    <td className="table-td font-semibold text-emerald-700">₹{(Number(s.sku_grey_qty||0)*Number(s.rate||0)).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td className="table-td whitespace-nowrap text-orange-600">{fmtDate(s.delivery_date)}</td>
                    <td className="table-td">
                      <div className="flex gap-1 justify-center">
                        {canEdit&&<button onClick={()=>handleEdit(s.id)} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold hover:bg-amber-200">✏️</button>}
                        <button onClick={()=>openPDF(s.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-semibold hover:bg-blue-700">📄</button>
                        {canDel&&<button onClick={()=>deleteSPO(s.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-semibold hover:bg-red-200">🗑</button>}
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
