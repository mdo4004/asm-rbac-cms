import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import FilterPanel from '../../components/common/FilterPanel';

const TODAY = new Date().toISOString().split('T')[0];
const PROCESSES = ['— Select Process —','Solid','Printed','Embroidered','Dyeing','Bleaching','Mercerizing','Calendering','Finishing','Other'];
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
};

const JPO_FILTER_CONFIG = [
  { key:'date',          label:'JPO Date',        type:'date-range' },
  { key:'jpo_number',    label:'JPO Number',      type:'text', placeholder:'e.g. JPO/2026/0001' },
  { key:'jobworker_name',label:'Mill / Jobworker', type:'text' },
  { key:'cpo_no',        label:'CPO Number',      type:'text' },
  { key:'quality',       label:'Quality',         type:'text' },
  { key:'process_type',  label:'Process Type',    type:'text' },
];
const jpoFiltersToParams = (vals) => {
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

export default function JobworkPO() {
  const { hasPermission, user } = useAuth();
  const modKey  = user?.role === 'admin' ? null : 'orders_jpo';
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
  const [jpoForm,     setJpoForm]     = useState({
    jobworker_name:'', process_type:'', jpo_date:TODAY, delivery_date:TODAY, rate:'', notes:''
  });
  const [editId,      setEditId]      = useState(null);
  const [editQtys,    setEditQtys]    = useState({ finish_qty:'', grey_qty:'' });
  const [submitting,  setSubmitting]  = useState(false);
  const [createdJPOs, setCreatedJPOs] = useState([]);
  const [recentJPOs,  setRecentJPOs]  = useState([]);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [filterVals,  setFilterVals]  = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    api.get('/master/all').then(r => setMaster(r.data.data || {})).catch(() => {});
    loadRecent(1);
  }, []);

  const loadRecent = (p = 1, filters = appliedFilters) => {
    const fp = jpoFiltersToParams(filters);
    api.get('/orders/jpo', { params: { limit:10, page:p, ...fp } }).then(r => {
      setRecentJPOs(r.data.data || []);
      setTotalPages(r.data.pages || 1);
      setPage(p);
    }).catch(() => {});
  };

  const handleFilterChange = (f, v) => setFilterVals(p => ({ ...p, [f]: v }));
  const handleFilterApply  = () => { const nf={...filterVals}; setAppliedFilters(nf); loadRecent(1, nf); };
  const handleFilterReset  = () => { setFilterVals({}); setAppliedFilters({}); loadRecent(1, {}); };

  const handleEdit = async (id) => {
    if (!canEdit) return toast.error('No edit permission');
    try {
      const r = await api.get(`/orders/jpo/${id}`);
      const d = r.data.data;
      setEditId(id);
      setJpoForm({
        jobworker_name: d.jobworker_name || '',
        process_type:   d.process_type || '',
        jpo_date:       d.jpo_date?.split('T')[0] || TODAY,
        delivery_date:  d.delivery_date?.split('T')[0] || TODAY,
        rate:           d.rate || '',
        notes:          d.notes || '',
      });
      if (d.skus?.length) {
        setEditQtys({ finish_qty: String(d.skus[0].finish_qty || 0), grey_qty: String(d.skus[0].grey_qty || 0) });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.info(`Editing: ${d.jpo_number}`);
    } catch {
      toast.error('Failed to load JPO');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditQtys({ finish_qty: '', grey_qty: '' });
    setJpoForm({ jobworker_name:'', process_type:'', jpo_date:TODAY, delivery_date:TODAY, rate:'', notes:'' });
  };

  const fetchCPO = async () => {
    if (!canAdd) return toast.error('No add permission');
    const no = cpoInput.trim().toUpperCase();
    if (!no) return toast.warning('Enter a CPO number');
    setFetching(true); setFetchMsg(''); setCpoData(null); setSkus([]); setCreatedJPOs([]);
    try {
      const r = await api.get(`/orders/jpo/fetch-cpo?no=${encodeURIComponent(no)}`);
      setCpoData(r.data.cpo);
      const skuList = r.data.skus || [];
      setSkus(skuList);
      const sel = {};
      skuList.forEach(s => {
        sel[s.id] = { checked: true, finish_qty: s.finish_qty || 0, grey_qty: s.grey_qty || 0 };
      });
      setSelected(sel);
      setJpoForm(p => ({
        ...p,
        jobworker_name: r.data.cpo.mill_name || '',
        delivery_date:  r.data.cpo.delivery_date?.split('T')[0] || TODAY,
      }));
      setFetchMsg(`✅ Found ${skuList.length} SKU${skuList.length !== 1 ? 's' : ''} for ${no} — ${r.data.cpo.customer_name}`);
    } catch (err) {
      setFetchMsg(`❌ ${err.response?.data?.message || 'CPO not found'}`);
    } finally {
      setFetching(false);
    }
  };

  const toggleAll = (val) => {
    const sel = {};
    skus.forEach(s => { sel[s.id] = { ...selected[s.id], checked: val }; });
    setSelected(sel);
  };

  // ── Extracted handlers to avoid JSX parser issue with complex arrow fns ──
  const updateFinishQty = (skuId, val) => {
    setSelected(prev => ({
      ...prev,
      [skuId]: { ...prev[skuId], finish_qty: val }
    }));
  };

  const updateGreyQty = (skuId, val) => {
    setSelected(prev => ({
      ...prev,
      [skuId]: { ...prev[skuId], grey_qty: val }
    }));
  };

  const toggleSKU = (skuId, checked) => {
    setSelected(prev => ({
      ...prev,
      [skuId]: { ...prev[skuId], checked }
    }));
  };

  const selectedList = skus.filter(s => selected[s.id]?.checked);

  const handleSubmit = async () => {
    if (editId) {
      if (!jpoForm.jobworker_name) return toast.error('Enter Mill / Jobworker name');
      setSubmitting(true);
      try {
        await api.put(`/orders/jpo/${editId}`, {
          ...jpoForm,
          rate:       parseFloat(jpoForm.rate) || 0,
          finish_qty: parseFloat(editQtys.finish_qty) || 0,
          grey_qty:   parseFloat(editQtys.grey_qty) || 0,
        });
        toast.success('✅ JPO Updated!');
        cancelEdit();
        loadRecent(1);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Update failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!selectedList.length)    return toast.error('Select at least one SKU');
    if (!jpoForm.jobworker_name) return toast.error('Enter Mill / Jobworker name');
    setSubmitting(true);
    try {
      const r = await api.post('/orders/jpo', {
        cpo_id:  cpoData.id,
        cpo_no:  cpoData.order_no,
        ...jpoForm,
        rate: parseFloat(jpoForm.rate) || 0,
        selected_skus: selectedList.map(s => ({
          sku_id:     s.id,
          finish_qty: parseFloat(selected[s.id]?.finish_qty) || 0,
          grey_qty:   parseFloat(selected[s.id]?.grey_qty) || 0,
        })),
      });
      setCreatedJPOs(r.data.created);
      toast.success(`✅ Created ${r.data.created.length} JPO(s)!`);
      setCpoInput(''); setCpoData(null); setSkus([]); setSelected({});
      setJpoForm({ jobworker_name:'', process_type:'', jpo_date:TODAY, delivery_date:TODAY, rate:'', notes:'' });
      setFetchMsg('');
      loadRecent(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openPDF = (id) => {
    const base = import.meta.env.VITE_API_URL || '/api';
    window.open(`${base}/orders/jpo/${id}/pdf`, '_blank');
  };

  const deleteJPO = async (id) => {
    if (!canDel) return toast.error('No delete permission');
    if (!confirm('Delete this JPO?')) return;
    try {
      await api.delete(`/orders/jpo/${id}`);
      toast.success('Deleted');
      loadRecent(page);
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-xl font-black text-gray-800">
              Jobwork <span className="text-red-600">Purchase Order</span>
            </h1>
            {!canAdd && !editId && (
              <p className="text-xs text-orange-500 mt-0.5">👁 View only — no create permission</p>
            )}
          </div>
        </div>
        {editId && (
          <button onClick={cancelEdit} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-semibold">
            ✕ Cancel Edit
          </button>
        )}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">

        {/* ── EDIT MODE ── */}
        {editId && canEdit ? (
          <div>
            <div className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
              ✏️ EDIT JPO
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="form-label">JPO DATE *</label>
                <input type="date" className="form-input" value={jpoForm.jpo_date}
                  onChange={e => setJpoForm(p => ({ ...p, jpo_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">MILL / JOBWORKER *</label>
                <input type="text" className="form-input" list="mill-list-e" value={jpoForm.jobworker_name}
                  onChange={e => setJpoForm(p => ({ ...p, jobworker_name: e.target.value }))} />
                <datalist id="mill-list-e">
                  {(master.mills || []).map(m => <option key={m.id} value={m.name} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="form-label">PROCESS TYPE</label>
                <select className="form-input" value={jpoForm.process_type}
                  onChange={e => setJpoForm(p => ({ ...p, process_type: e.target.value }))}>
                  {PROCESSES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">RATE (₹/MTR)</label>
                <input type="number" className="form-input" value={jpoForm.rate}
                  onChange={e => setJpoForm(p => ({ ...p, rate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="form-label">FINISH QTY (m)</label>
                <input type="number" className="form-input bg-red-50 border-red-300"
                  value={editQtys.finish_qty}
                  onChange={e => setEditQtys(p => ({ ...p, finish_qty: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">GREY QTY (m)</label>
                <input type="number" className="form-input bg-orange-50 border-orange-300"
                  value={editQtys.grey_qty}
                  onChange={e => setEditQtys(p => ({ ...p, grey_qty: e.target.value }))} />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">DELIVERY DATE</label>
              <input type="date" className="form-input" value={jpoForm.delivery_date}
                onChange={e => setJpoForm(p => ({ ...p, delivery_date: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="form-label">NOTES</label>
              <textarea className="form-input h-20 resize-none" value={jpoForm.notes}
                onChange={e => setJpoForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition disabled:opacity-50">
              {submitting ? '⏳ Updating…' : '💾 Update JPO'}
            </button>
          </div>

        ) : canAdd ? (
          <>
          {/* ── STEP 1 ── */}
          <div className="mb-6">
            <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              STEP 1 — FETCH CPO
            </div>
            <div className="flex gap-2">
              <input className="form-input flex-1 font-mono text-sm" placeholder="Enter CPO No (e.g. AS/2026/0001)"
                value={cpoInput}
                onChange={e => setCpoInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && fetchCPO()} />
              <button onClick={fetchCPO} disabled={fetching}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">
                {fetching ? '⏳' : '🔍'} Fetch SKUs
              </button>
            </div>
            {fetchMsg && (
              <p className={`text-xs mt-2 font-medium ${fetchMsg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>
                {fetchMsg}
              </p>
            )}
          </div>

          {/* ── STEP 2 ── */}
          {cpoData && skus.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  STEP 2 — SELECT SKUs
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">✓ All</button>
                  <button onClick={() => toggleAll(false)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-semibold">✗ None</button>
                </div>
              </div>

              {/* CPO info bar */}
              <div className="flex flex-wrap gap-3 text-xs bg-red-50 rounded-lg px-3 py-2 mb-3 border border-red-100">
                <span>🏭 {cpoData.selling_firm}</span>
                <span>|</span>
                <span>👤 {cpoData.customer_name}</span>
                <span>|</span>
                <span>📅 {fmtDate(cpoData.delivery_date)}</span>
              </div>

              {/* SKU rows */}
              <div className="space-y-2">
                {skus.map(s => {
                  const sel = selected[s.id] || {};
                  const finishVal = sel.finish_qty !== undefined ? sel.finish_qty : s.finish_qty;
                  const greyVal   = sel.grey_qty   !== undefined ? sel.grey_qty   : s.grey_qty;
                  return (
                    <div key={s.id}
                      className={`border rounded-lg px-3 py-2.5 text-xs transition-all ${sel.checked ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={!!sel.checked}
                          onChange={e => toggleSKU(s.id, e.target.checked)}
                          className="w-4 h-4 accent-red-600" />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-800">{s.quality}</span>
                          {s.color && <span className="ml-2 text-gray-500">{s.color}</span>}
                          {s.width && <span className="ml-2 text-gray-400">{s.width}"</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {/* FINISH QTY — editable in JPO */}
                          <div className="text-center">
                            <p className="text-[10px] font-semibold text-red-500 mb-0.5">FINISH QTY</p>
                            <input
                              type="number"
                              className="w-20 border border-red-300 rounded px-2 py-1 text-xs text-center bg-white focus:ring-1 focus:ring-red-400 focus:outline-none"
                              value={finishVal}
                              min="0"
                              step="0.01"
                              onChange={e => updateFinishQty(s.id, e.target.value)}
                            />
                          </div>
                          {/* GREY QTY — editable in JPO */}
                          <div className="text-center">
                            <p className="text-[10px] font-semibold text-orange-500 mb-0.5">GREY QTY</p>
                            <input
                              type="number"
                              className="w-20 border border-orange-300 rounded px-2 py-1 text-xs text-center bg-orange-50 focus:ring-1 focus:ring-orange-400 focus:outline-none"
                              value={greyVal}
                              min="0"
                              step="0.01"
                              onChange={e => updateGreyQty(s.id, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedList.length} selected →{' '}
                <strong className="text-red-700">{selectedList.length} JPO{selectedList.length !== 1 ? 's' : ''}</strong>
              </p>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {cpoData && (
            <div>
              <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                STEP 3 — JPO DETAILS
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="form-label">JPO DATE *</label>
                  <input type="date" className="form-input" value={jpoForm.jpo_date}
                    onChange={e => setJpoForm(p => ({ ...p, jpo_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">MILL / JOBWORKER *</label>
                  <input type="text" className="form-input" list="mill-list" value={jpoForm.jobworker_name}
                    onChange={e => setJpoForm(p => ({ ...p, jobworker_name: e.target.value }))} />
                  <datalist id="mill-list">
                    {(master.mills || []).map(m => <option key={m.id} value={m.name} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="form-label">PROCESS / WORK TYPE</label>
                  <select className="form-input" value={jpoForm.process_type}
                    onChange={e => setJpoForm(p => ({ ...p, process_type: e.target.value }))}>
                    {PROCESSES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">RATE (₹/MTR)</label>
                  <input type="number" className="form-input" value={jpoForm.rate} min="0"
                    onChange={e => setJpoForm(p => ({ ...p, rate: e.target.value }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">DELIVERY DATE</label>
                <input type="date" className="form-input" value={jpoForm.delivery_date}
                  onChange={e => setJpoForm(p => ({ ...p, delivery_date: e.target.value }))} />
              </div>
              <div className="mb-4">
                <label className="form-label">NOTES / SPECIAL INSTRUCTIONS</label>
                <textarea className="form-input h-20 resize-none" value={jpoForm.notes}
                  onChange={e => setJpoForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-base transition disabled:opacity-50">
                {submitting ? '⏳ Generating…' : '💾 Generate JPO Numbers for Selected SKUs'}
              </button>

              {/* PDF buttons after creation */}
              {createdJPOs.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm font-bold text-red-700 mb-2">✅ JPOs Created — click to view PDF:</p>
                  <div className="flex flex-wrap gap-2">
                    {createdJPOs.map(({ jpo_id, jpo_number }) => (
                      <button key={jpo_id} onClick={() => openPDF(jpo_id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
                        📄 {jpo_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </>

        ) : (
          /* View only */
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">👁</div>
            <p className="font-semibold">View Only</p>
            <p className="text-sm">You can view records below but cannot create new JPOs</p>
          </div>
        )}
      </div>

      {/* ── Records Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">
            📋 Jobwork PO Records
            {countActive(appliedFilters) > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {countActive(appliedFilters)} {countActive(appliedFilters)>1?"filters":"filter"} active
              </span>
            )}
          </h2>
          <button onClick={() => loadRecent(1)} className="text-xs text-blue-600 hover:underline">↻ Refresh</button>
        </div>
        <FilterPanel config={JPO_FILTER_CONFIG} values={filterVals} onChange={handleFilterChange}
          onApply={handleFilterApply} onReset={handleFilterReset} activeCount={countActive(appliedFilters)} />

        {recentJPOs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No JPOs yet</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="table-th">JPO No</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">CPO No</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Mill / Jobworker</th>
                  <th className="table-th">Quality</th>
                  <th className="table-th">Color</th>
                  <th className="table-th">Process</th>
                  <th className="table-th">Finish Qty</th>
                  <th className="table-th">Grey Qty</th>
                  <th className="table-th">Rate</th>
                  <th className="table-th">Delivery</th>
                  <th className="table-th text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentJPOs.map(j => (
                  <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-mono font-bold text-red-700">{j.jpo_number}</td>
                    <td className="table-td whitespace-nowrap">{fmtDate(j.jpo_date)}</td>
                    <td className="table-td">
                      <span className="text-blue-600 font-semibold">{j.cpo_no}</span>
                    </td>
                    <td className="table-td max-w-[70px] truncate">{j.customer_name}</td>
                    <td className="table-td font-medium max-w-[90px] truncate">{j.jobworker_name}</td>
                    <td className="table-td max-w-[80px] truncate">{j.quality}</td>
                    <td className="table-td">{j.color || '—'}</td>
                    <td className="table-td">
                      {j.process_type && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                          {j.process_type}
                        </span>
                      )}
                      {!j.process_type && '—'}
                    </td>
                    <td className="table-td font-semibold">{Number(j.sku_finish_qty || 0).toFixed(2)} m</td>
                    <td className="table-td font-semibold">{Number(j.sku_grey_qty || 0).toFixed(2)} m</td>
                    <td className="table-td">₹{Number(j.rate || 0).toFixed(0)}</td>
                    <td className="table-td whitespace-nowrap text-orange-600">{fmtDate(j.delivery_date)}</td>
                    <td className="table-td">
                      <div className="flex gap-1 justify-center">
                        {canEdit && (
                          <button onClick={() => handleEdit(j.id)}
                            className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold hover:bg-amber-200">
                            ✏️
                          </button>
                        )}
                        <button onClick={() => openPDF(j.id)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-semibold hover:bg-blue-700">
                          📄
                        </button>
                        {canDel && (
                          <button onClick={() => deleteJPO(j.id)}
                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-semibold hover:bg-red-200">
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              <button disabled={page <= 1} onClick={() => loadRecent(page - 1)}
                className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-40">‹ Prev</button>
              <span className="px-3 py-1 text-xs text-gray-500">Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => loadRecent(page + 1)}
                className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-40">Next ›</button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
