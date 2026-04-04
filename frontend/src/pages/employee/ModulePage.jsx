import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import FilterPanel from '../../components/common/FilterPanel';

// ─── helpers ────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    try {
      const dt = new Date(v);
      if (!isNaN(dt)) return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    } catch(e) {}
  }
  return String(v);
};

// ─── FORM CONFIGS ────────────────────────────────────────────
const FORMS = {
  'customer-po': {
    title:'Customer PO', icon:'📋', subtitle:'Order Creation', color:'blue',
    tableFields:['cpo_number','po_date','customer_name','selling_firm','quality_name','finish_qty','status'],
    fields:[
      { key:'selling_firm',  label:'Selling Firm',      type:'select-master', master:'firms',      required:true,  span:2 },
      { key:'cpo_number',    label:'CPO Number',        type:'cpo',           readOnly:true,        span:2 },
      { key:'po_date',       label:'PO Date',           type:'date',          required:true },
      { key:'customer_name', label:'Customer',          type:'select-master', master:'customers',   required:true },
      { key:'quality_name',  label:'Quality',           type:'combobox-master',master:'qualities',  required:true },
      { key:'width',         label:'Width',             type:'text',          placeholder:'e.g. 54"' },
      { key:'gsm',           label:'GSM',               type:'number' },
      { key:'fabric_type',   label:'Fabric Type',       type:'select',        options:['','Woven','Knit','Non-woven','Other'] },
      { key:'finish_qty',    label:'Finish Qty (Mtr)',  type:'number',        required:true },
      { key:'greige_qty',    label:'Greige Qty (Auto)', type:'number',        readOnly:true },
      { key:'delivery_date', label:'Delivery Date',     type:'date',          required:true },
      { key:'followuper',    label:'Followuper',        type:'select-master', master:'followups' },
      { key:'merchant_name', label:'Merchant',          type:'select-master', master:'merchants' },
      { key:'mill_name',     label:'Mill Name',         type:'select-master', master:'mills' },
      { key:'color',         label:'Color',             type:'text' },
      { key:'weaver_name',   label:'Weaver Name',       type:'text' },
      { key:'status',        label:'Status',            type:'select-master', master:'statuses' },
      { key:'notes',         label:'Notes',             type:'textarea',      span:2 },
    ],
  },
  'inward': {
    title:'Inward', icon:'📦', subtitle:'Greige', color:'green',
    tableFields:['bill_no','inward_date','party_name','firm_name','quality_name','grey_meter','amount'],
    fields:[
      { key:'po_reference',  label:'Order Number',   type:'text',            placeholder:'e.g. ASM/2026/0001', span:2 },
      { key:'bill_no',       label:'Bill No',        type:'text',            required:true },
      { key:'inward_date',   label:'Bill Date',      type:'date' },
      { key:'firm_name',     label:'Firm',           type:'select-master',   master:'firms',     required:true },
      { key:'party_name',    label:'Supplier',       type:'select-master',   master:'suppliers', required:true },
      { key:'quality_name',  label:'Quality',        type:'combobox-master', master:'qualities', required:true },
      { key:'width',         label:'Width',          type:'text' },
      { key:'pieces',        label:'Pieces',         type:'number' },
      { key:'grey_meter',    label:'Grey Meter',     type:'number',          required:true },
      { key:'rate',          label:'Rate (₹/Mtr)',   type:'number' },
      { key:'amount',        label:'Amount (₹)',     type:'number',          placeholder:'Auto or type manually', autoNote:'+5% GST auto · editable' },
      { key:'lot_no',        label:'Lot No',         type:'text' },
    ],
  },
  'outward': {
    title:'Outward', icon:'🚚', subtitle:'Greige', color:'orange',
    tableFields:['chalan_no','chalan_date','firm_name','mill_name','quality_name','grey_meter'],
    fields:[
      { key:'po_reference',  label:'Order Number',   type:'text',            required:true, span:2 },
      { key:'chalan_no',     label:'Chalan No',      type:'text',            required:true },
      { key:'chalan_date',   label:'Chalan Date',    type:'date' },
      { key:'firm_name',     label:'Firm',           type:'select-master',   master:'firms',     required:true },
      { key:'mill_name',     label:'Mill',           type:'select-master',   master:'mills',     required:true },
      { key:'quality_name',  label:'Quality',        type:'combobox-master', master:'qualities', required:true },
      { key:'width',         label:'Width',          type:'text' },
      { key:'pieces',        label:'Pieces',         type:'number' },
      { key:'grey_meter',    label:'Grey Meter',     type:'number',          required:true },
    ],
  },
  'jobwork': {
    title:'Jobwork', icon:'⚙️', subtitle:'', color:'purple',
    tableFields:['bill_no','jw_date','mill_name','firm_name','quality_name','finish_meter','amount'],
    fields:[
      { key:'po_reference',  label:'Order Number',   type:'text',            required:true, span:2 },
      { key:'mill_name',     label:'Mill',           type:'select-master',   master:'mills',     required:true },
      { key:'bill_no',       label:'Bill No',        type:'text',            required:true },
      { key:'jw_date',       label:'Date',           type:'date' },
      { key:'quality_name',  label:'Quality',        type:'combobox-master', master:'qualities', required:true },
      { key:'firm_name',     label:'Firm',           type:'select-master',   master:'firms',     required:true },
      { key:'pieces',        label:'Pieces',         type:'number' },
      { key:'grey_meter',    label:'Grey Meter',     type:'number' },
      { key:'finish_meter',  label:'Finish Meter',   type:'number',          required:true },
      { key:'rate',          label:'Rate (₹/Mtr)',   type:'number' },
      { key:'amount',        label:'Amount (₹)',     type:'number',          placeholder:'Auto or type manually', autoNote:'+5% GST auto · editable' },
    ],
  },
  'sales': {
    title:'Sales', icon:'🔥', subtitle:'', color:'red',
    tableFields:['invoice_no','bill_date','firm_name','buyer_name','meters','total_amount','merchant_name'],
    fields:[
      { key:'po_reference',  label:'Order Number',   type:'text',            required:true, span:2 },
      { key:'invoice_no',    label:'Invoice No',     type:'text',            required:true },
      { key:'bill_date',     label:'Bill Date',      type:'date' },
      { key:'firm_name',     label:'Firm',           type:'select-master',   master:'firms',     required:true },
      { key:'buyer_name',    label:'Buyer',          type:'select-master',   master:'buyers',    required:true },
      { key:'bales',         label:'Bales',          type:'number' },
      { key:'meters',        label:'Meter',          type:'number',          required:true },
      { key:'rate',          label:'Rate',           type:'number' },
      { key:'total_amount',  label:'Total Amount',   type:'number',          required:true },
      { key:'merchant_name', label:'Merchant',       type:'select-master',   master:'merchants', required:true },
      { key:'work_type',     label:'Work Type',      type:'select-master',   master:'work_types' },
      { key:'city',          label:'City',           type:'text' },
      { key:'transport',     label:'Transport',      type:'text' },
    ],
  },
};

const COLOR = {
  blue:   { btn:'bg-blue-600 hover:bg-blue-700',     header:'from-blue-600 to-blue-700',     light:'border-blue-200',   accent:'text-blue-600' },
  green:  { btn:'bg-green-600 hover:bg-green-700',   header:'from-green-600 to-green-700',   light:'border-green-200',  accent:'text-green-600' },
  orange: { btn:'bg-orange-500 hover:bg-orange-600', header:'from-orange-500 to-orange-600', light:'border-orange-200', accent:'text-orange-500' },
  purple: { btn:'bg-purple-600 hover:bg-purple-700', header:'from-purple-600 to-purple-700', light:'border-purple-200', accent:'text-purple-600' },
  red:    { btn:'bg-red-500 hover:bg-red-600',       header:'from-red-500 to-red-600',       light:'border-red-200',    accent:'text-red-500' },
};
const FILTER_CONFIG = {
  'customer-po': [
    { key:'date',          label:'PO Date',        type:'date-range' },
    { key:'cpo_number',    label:'Order No',        type:'text', placeholder:'e.g. AS/2026/0001' },
    { key:'customer_name', label:'Customer Name',   type:'text' },
    { key:'selling_firm',  label:'Selling Firm',    type:'text' },
  ],
  'inward': [
    { key:'date',          label:'Inward Date',    type:'date-range' },
    { key:'bill_no',       label:'Bill No',        type:'text' },
    { key:'party_name',    label:'Supplier Name',  type:'text' },
    { key:'firm_name',     label:'Firm Name',      type:'text' },
    { key:'quality_name',  label:'Quality',        type:'text' },
    { key:'amount',        label:'Amount (₹)',      type:'amount-range' },
  ],
  'outward': [
    { key:'date',          label:'Chalan Date',    type:'date-range' },
    { key:'chalan_no',     label:'Chalan No',      type:'text' },
    { key:'firm_name',     label:'Firm Name',      type:'text' },
    { key:'mill_name',     label:'Mill Name',       type:'text' },
    { key:'quality_name',  label:'Quality',        type:'text' },
  ],
  'jobwork': [
    { key:'date',          label:'Jobwork Date',   type:'date-range' },
    { key:'bill_no',       label:'Bill No',        type:'text' },
    { key:'mill_name',     label:'Mill Name',      type:'text' },
    { key:'firm_name',     label:'Firm Name',      type:'text' },
    { key:'quality_name',  label:'Quality',        type:'text' },
    { key:'amount',        label:'Amount (₹)',     type:'amount-range' },
  ],
  'sales': [
    { key:'date',          label:'Bill Date',      type:'date-range' },
    { key:'invoice_no',    label:'Invoice No',     type:'text' },
    { key:'buyer_name',    label:'Buyer Name',     type:'text' },
    { key:'firm_name',     label:'Firm Name',      type:'text' },
    { key:'merchant_name', label:'Merchant',       type:'text' },
    { key:'amount',        label:'Amount (₹)',     type:'amount-range' },
  ],
  'enquiry': [
    { key:'date',          label:'Enquiry Date',   type:'date-range' },
    { key:'customer_name', label:'Customer Name',  type:'text' },
    { key:'quality_name',  label:'Quality',        type:'text' },
    { key:'status',        label:'Status',         type:'select', options:['pending','in_progress','completed','cancelled','new','follow_up','converted'] },
  ],
  'returns': [
    { key:'date',          label:'Return Date',    type:'date-range' },
    { key:'party_name',    label:'Party Name',     type:'text' },
    { key:'invoice_ref',   label:'Invoice Ref',    type:'text' },
    { key:'quality_name',  label:'Quality',        type:'text' },
    { key:'status',        label:'Status',         type:'select', options:['pending','approved','rejected','processed'] },
  ],
  'sampling': [
    { key:'date',          label:'Sample Date',    type:'date-range' },
    { key:'customer_name', label:'Customer Name',  type:'text' },
    { key:'quality_name',  label:'Quality',        type:'text' },
    { key:'status',        label:'Status',         type:'select', options:['pending','sent','approved','rejected'] },
  ],
};

const filtersToParams = (vals) => {
  const p = {};
  Object.entries(vals).forEach(([k, v]) => {
    if (!v) return;
    if (k.endsWith('_from')) p['date_from'] = v;
    else if (k.endsWith('_to')) p['date_to'] = v;
    else if (k.endsWith('_min')) p['amount_min'] = v;
    else if (k.endsWith('_max')) p['amount_max'] = v;
    else p[k] = v;
  });
  return p;
};

const countActiveFilters = (vals) => Object.values(vals).filter(v => v && v !== '').length;


// ── MASTER DATA CATEGORIES ────────────────────────────────────
const MASTER_TABS = [
  { key:'firms',      label:'Selling Firm',  icon:'🏢', fields:[
    { key:'name',   label:'Firm Name',  required:true },
    { key:'prefix', label:'CPO Prefix (e.g. ASM)', placeholder:'Auto-generated if blank' },
    { key:'phone',  label:'Phone' },
    { key:'city',   label:'City' },
  ]},
  { key:'qualities',  label:'Quality',       icon:'🧵', fields:[
    { key:'name',          label:'Quality Name', required:true },
    { key:'shrinkage_pct', label:'Shrinkage %',  type:'number' },
    { key:'description',   label:'Description',  type:'textarea' },
  ]},
  { key:'customers',  label:'Customer',      icon:'👤', fields:[
    { key:'name',        label:'Customer Name', required:true },
    { key:'credit_days', label:'Credit Days',   type:'number' },
    { key:'phone',       label:'Phone' },
    { key:'city',        label:'City' },
  ]},
  { key:'followups',  label:'Followuper',    icon:'📞', fields:[
    { key:'name',       label:'Name',       required:true },
    { key:'phone',      label:'Phone' },
    { key:'department', label:'Department' },
  ]},
  { key:'mills',      label:'Mill Name',     icon:'🏭', fields:[
    { key:'name',  label:'Mill Name', required:true },
    { key:'phone', label:'Phone' },
    { key:'city',  label:'City' },
  ]},
  { key:'merchants',  label:'Merchant',      icon:'💼', fields:[
    { key:'name',  label:'Merchant Name', required:true },
    { key:'phone', label:'Phone' },
  ]},
  { key:'statuses',   label:'Status',        icon:'🏷️', fields:[
    { key:'name', label:'Status Name', required:true },
  ]},
  { key:'suppliers',  label:'Supplier',      icon:'📦', fields:[
    { key:'name',  label:'Supplier Name', required:true },
    { key:'phone', label:'Phone' },
    { key:'city',  label:'City' },
  ]},
  { key:'work_types', label:'Work Type',     icon:'⚒️', fields:[
    { key:'name', label:'Work Type', required:true },
  ]},
  { key:'buyers',     label:'Buyer',         icon:'🛒', fields:[
    { key:'name',  label:'Buyer Name', required:true },
    { key:'phone', label:'Phone' },
    { key:'city',  label:'City' },
  ]},
];

// ─── Reusable Components ─────────────────────────────────────
function StatusBadge({ val }) {
  const map = {
    completed:'bg-green-100 text-green-700', approved:'bg-green-100 text-green-700',
    sent:'bg-green-100 text-green-700',      converted:'bg-green-100 text-green-700',
    cancelled:'bg-red-100 text-red-600',     rejected:'bg-red-100 text-red-600',
    in_progress:'bg-blue-100 text-blue-700', follow_up:'bg-blue-100 text-blue-700',
    pending:'bg-yellow-100 text-yellow-700', new:'bg-yellow-100 text-yellow-700',
    processed:'bg-gray-100 text-gray-600',   closed:'bg-gray-100 text-gray-600',
  };
  const cls = map[val] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{val||'—'}</span>;
}

function Combobox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState(value || '');
  const filtered = (options||[]).filter(o => o.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { setQ(value || ''); }, [value]);
  return (
    <div className="relative">
      <input className="form-input" value={q} placeholder={placeholder||'Select or type...'}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <div key={o} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
              onMouseDown={() => { onChange(o); setQ(o); setOpen(false); }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, perPage, setPage }) {
  if (!total || total <= perPage) return null;
  const pages = Math.ceil(total / perPage);
  const nums = [];
  if (pages <= 7) { for (let i = 1; i <= pages; i++) nums.push(i); }
  else if (page <= 4) { for (let i = 1; i <= 7; i++) nums.push(i); }
  else if (page >= pages - 3) { for (let i = pages - 6; i <= pages; i++) nums.push(i); }
  else { for (let i = page - 3; i <= page + 3; i++) nums.push(i); }
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t text-sm text-gray-500 bg-gray-50">
      <span className="text-xs text-gray-500">
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of <strong>{total}</strong> records
      </span>
      <div className="flex gap-1">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-gray-100 text-xs font-medium">← Prev</button>
        {nums.map(p => (
          <button key={p} onClick={() => setPage(p)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>{p}</button>
        ))}
        <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
          className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-gray-100 text-xs font-medium">Next →</button>
      </div>
    </div>
  );
}

// ── MASTER DATA MODULE (with pagination) ─────────────────────
function MasterDataModule() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab]   = useState(MASTER_TABS[0].key);
  const [rows, setRows]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editRow, setEditRow]       = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const PER_PAGE = 10;

  const tab = MASTER_TABS.find(t => t.key === activeTab);

  const canView   = hasPermission('master_data', 'view');
  const canAdd    = hasPermission('master_data', 'add');
  const canEdit   = hasPermission('master_data', 'edit');
  const canDelete = hasPermission('master_data', 'delete');

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    api.get(`/master/${activeTab}`, { params: { page, limit: PER_PAGE, search } })
      .then(r => { setRows(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab, page, search, canView]);

  useEffect(() => { setRows([]); setTotal(0); setPage(1); setSearch(''); setShowForm(false); }, [activeTab]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    if (!canAdd) return toast.error('No permission to add');
    setEditRow(null); setForm({}); setShowForm(true);
  };

  const openEdit = (row) => {
    if (!canEdit) return toast.error('No permission to edit');
    setEditRow(row); setForm({ ...row }); setShowForm(true);
  };

  const handleSave = async () => {
    const missing = tab.fields.filter(f => f.required && !form[f.key]);
    if (missing.length) { toast.error(`Required: ${missing.map(f => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      if (editRow) {
        await api.put(`/master/${activeTab}/${editRow.id}`, form);
        toast.success('Updated successfully!');
      } else {
        await api.post(`/master/${activeTab}`, form);
        toast.success('Added successfully!');
      }
      setShowForm(false); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return toast.error('No permission to delete');
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/master/${activeTab}/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-sm mt-1">You don't have permission to view Master Data.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <span>📋</span> Master Data
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Manage master records · Used in all form dropdowns
          </p>
        </div>
      </div>

      {/* Tab Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {MASTER_TABS.map(t => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all
              ${activeTab === t.key
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
            <span>{t.icon}</span><span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tab.icon}</span>
            <h2 className="font-bold text-gray-800">{tab.label}</h2>
            <span className="text-xs text-gray-400">({total} records)</span>
          </div>
          <div className="flex gap-2">
            <input className="form-input w-44 text-sm" placeholder="🔍 Search..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            {canAdd && (
              <button onClick={openCreate}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                + Add {tab.label}
              </button>
            )}
          </div>
        </div>

        {/* Inline form */}
        {showForm && (
          <div className="border-b bg-blue-50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-blue-800">
                {editRow ? `✏️ Edit ${tab.label}` : `➕ New ${tab.label}`}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tab.fields.map(f => (
                <div key={f.key} className={f.type === 'textarea' ? 'col-span-full' : ''}>
                  <label className="form-label">
                    {f.label}{f.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea className="form-input" rows={2}
                      value={form[f.key] || ''} placeholder={f.placeholder || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  ) : f.type === 'number' ? (
                    <input type="number" className="form-input"
                      value={form[f.key] || ''} placeholder={f.placeholder || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  ) : (
                    <input type="text" className="form-input"
                      value={form[f.key] || ''} placeholder={f.placeholder || f.label}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? 'Saving…' : editRow ? 'Update' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-100 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th w-10">#</th>
                {tab.fields.slice(0, 4).map(f => (
                  <th key={f.key} className="table-th">{f.label.toUpperCase()}</th>
                ))}
                <th className="table-th text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={tab.fields.slice(0, 4).length + 2} className="table-td text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading…</span>
                  </div>
                </td></tr>
              )}
              {!loading && !rows.length && (
                <tr><td colSpan={tab.fields.slice(0, 4).length + 2} className="table-td text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">📂</div>
                  <p className="font-semibold">No {tab.label} records yet</p>
                  {canAdd && <p className="text-xs mt-1">Click "+ Add {tab.label}" to get started</p>}
                </td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${editRow?.id === row.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <td className="table-td text-gray-400 text-xs font-mono">{(page - 1) * PER_PAGE + i + 1}</td>
                  {tab.fields.slice(0, 4).map(f => (
                    <td key={f.key} className="table-td max-w-[160px] truncate" title={fmt(row[f.key])}>
                      {fmt(row[f.key])}
                    </td>
                  ))}
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => openEdit(row)}
                          className="text-xs text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200 transition whitespace-nowrap">
                          ✏️ Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(row.id)}
                          className="text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition whitespace-nowrap">
                          🗑️ Delete
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-gray-400 italic">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} perPage={PER_PAGE} setPage={setPage} />
      </div>
    </div>
  );
}

// ── SMART MODULE (forms with master dropdowns) ────────────────
function SmartModule({ cfg, apiPath }) {
  const { hasPermission } = useAuth();
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [masters, setMasters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [cpoPreview, setCpoPreview] = useState('');
  const [filterVals, setFilterVals]         = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});
  const cpoFetched  = useRef(false);
  const PER_PAGE = 10;
  const color = COLOR[cfg.color] || COLOR.blue;
  const filterConfig = FILTER_CONFIG[apiPath] || [];

  const canAdd    = hasPermission(apiPath === 'customer-po' ? 'customer_po' : apiPath, 'add');
  const canEdit   = hasPermission(apiPath === 'customer-po' ? 'customer_po' : apiPath, 'edit');
  const canDelete = hasPermission(apiPath === 'customer-po' ? 'customer_po' : apiPath, 'delete');

  const loadMasters = useCallback(() => {
    api.get('/master/all').then(r => {
      const d = r.data.data || {};
      setMasters({
        firms:      (d.firms      || []).map(x => ({ name: x.name, prefix: x.prefix, id: x.id })),
        customers:  (d.customers  || []).map(x => x.name),
        qualities:  (d.qualities  || []).map(x => x.name),
        mills:      (d.mills      || []).map(x => x.name),
        suppliers:  (d.suppliers  || []).map(x => x.name),
        merchants:  (d.merchants  || []).map(x => x.name),
        followups:  (d.followups  || []).map(x => x.name),
        statuses:   (d.statuses   || []).map(x => x.name),
        work_types: (d.work_types || []).map(x => x.name),
        buyers:     (d.buyers     || []).map(x => x.name),
      });
    }).catch(() => {});
  }, []);

  useEffect(() => { loadMasters(); }, [loadMasters]);

  const load = useCallback(() => {
    setLoading(true);
    const filterParams = filtersToParams(appliedFilters);
    api.get(`/${apiPath}`, { params: { page, limit: PER_PAGE, search, ...filterParams } })
      .then(r => { setRows(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [page, search, apiPath, appliedFilters]);

  useEffect(() => { load(); }, [load]);

  const defaultForm = () => {
    const f = {};
    cfg.fields.forEach(fld => { f[fld.key] = fld.type === 'date' ? today() : ''; });
    return f;
  };

  const openCreate = () => {
    setEditRow(null); setForm(defaultForm()); setShowForm(true); setCpoPreview('');
    cpoFetched.current = false;
    setTimeout(() => document.getElementById('smart-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const openEdit = (row) => {
    setEditRow(row);
    const f = { ...row };
    cfg.fields.forEach(fld => { if (fld.type === 'date' && f[fld.key]) f[fld.key] = f[fld.key].split('T')[0]; });
    setForm(f); setShowForm(true);
    setCpoPreview(row.cpo_number || '');
    setTimeout(() => document.getElementById('smart-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const handleCancel = () => { setShowForm(false); setEditRow(null); setForm({}); setCpoPreview(''); };
  const handleFilterChange = (f, v) => setFilterVals(p => ({ ...p, [f]: v }));
  const handleFilterApply  = () => { setAppliedFilters({ ...filterVals }); setPage(1); };
  const handleFilterReset  = () => { setFilterVals({}); setAppliedFilters({}); setPage(1); };
  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (apiPath !== 'customer-po' || editRow) return;
    if (!form.selling_firm) { setCpoPreview(''); return; }
    const firm = (masters.firms || []).find(f => f.name === form.selling_firm);
    if (!firm) return;
    api.get('/master/cpo-preview', { params: { firm_id: firm.id } })
      .then(r => { if (r.data.success) setCpoPreview(r.data.cpo_number); })
      .catch(() => {});
  // eslint-disable-next-line
  }, [form.selling_firm, apiPath, editRow]);

  useEffect(() => {
    if (apiPath === 'customer-po' && form.finish_qty && parseFloat(form.finish_qty))
      setField('greige_qty', (parseFloat(form.finish_qty) * 1.08).toFixed(2));
  // eslint-disable-next-line
  }, [form.finish_qty]);

  useEffect(() => {
    if (form._amountManual) return;
    if (apiPath === 'inward' && form.rate && form.grey_meter)
      setField('amount', (parseFloat(form.rate) * parseFloat(form.grey_meter) * 1.05).toFixed(2));
    if (apiPath === 'jobwork' && form.rate && form.finish_meter)
      setField('amount', (parseFloat(form.rate) * parseFloat(form.finish_meter) * 1.05).toFixed(2));
  // eslint-disable-next-line
  }, [form.rate, form.grey_meter, form.finish_meter]);

  const handleSave = async () => {
    const missing = cfg.fields.filter(f => f.required && !form[f.key] && f.type !== 'cpo');
    if (missing.length) { toast.error(`Required: ${missing.map(f => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload._amountManual;
      delete payload.cpo_number;
      if (editRow) {
        await api.put(`/${apiPath}/${editRow.id}`, payload);
        toast.success('Updated successfully!');
      } else {
        const res = await api.post(`/${apiPath}`, payload);
        toast.success(`Record created! CPO: ${res.data.cpo_number || ''}`);
      }
      handleCancel(); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/${apiPath}/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const firmNames = (masters.firms || []).map(f => f.name);

  const renderField = (fld) => {
    const val = form[fld.key] ?? '';
    const cls = 'form-input' + (fld.readOnly ? ' bg-gray-100 cursor-not-allowed text-gray-500' : '');

    if (fld.type === 'cpo') {
      const display = editRow ? (form.cpo_number || 'Will be assigned') : (cpoPreview || 'Select Selling Firm first');
      return (
        <div className="form-input bg-gray-100 text-gray-600 font-mono text-sm flex items-center gap-2">
          <span className="text-blue-500">🔢</span>
          <span className="font-bold text-blue-700">{display}</span>
          {!editRow && cpoPreview && <span className="text-xs text-gray-400 ml-auto">(auto-assigned on save)</span>}
        </div>
      );
    }
    if (fld.type === 'select-master') {
      const opts = fld.master === 'firms' ? firmNames : (masters[fld.master] || []);
      return (
        <select className={cls} value={val} disabled={fld.readOnly}
          onChange={e => setField(fld.key, e.target.value)}>
          <option value="">— Select —</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (fld.type === 'combobox-master') {
      return <Combobox value={val} onChange={v => setField(fld.key, v)}
        options={masters[fld.master] || []} placeholder="Select or type quality..." />;
    }
    if (fld.type === 'select') {
      return (
        <select className={cls} value={val} onChange={e => setField(fld.key, e.target.value)}>
          {(fld.options || []).map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
        </select>
      );
    }
    if (fld.type === 'date') {
      return <input type="date" className={cls} value={val} readOnly={fld.readOnly}
        onChange={e => setField(fld.key, e.target.value)} />;
    }
    if (fld.type === 'textarea') {
      return <textarea className={cls} rows={3} value={val} placeholder={fld.placeholder || ''}
        onChange={e => setField(fld.key, e.target.value)} />;
    }
    if (fld.type === 'number') {
      return <input type="number" className={cls} value={val} readOnly={fld.readOnly}
        placeholder={fld.placeholder || ''}
        onChange={e => {
          if (fld.key === 'amount') setForm(p => ({ ...p, amount: e.target.value, _amountManual: true }));
          else setField(fld.key, e.target.value);
        }} />;
    }
    return <input type="text" className={cls} value={val} readOnly={fld.readOnly}
      placeholder={fld.placeholder || ''} onChange={e => setField(fld.key, e.target.value)} />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{cfg.icon}</span>
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              {cfg.title}
              {cfg.subtitle && <span className={`text-lg ${color.accent}`}>{cfg.subtitle}</span>}
            </h1>
            <p className="text-gray-400 text-sm">{total} total records · 10 per page</p>
          </div>
        </div>
        {!showForm && canAdd && (
          <button onClick={openCreate}
            className={`text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow transition-all active:scale-95 ${color.btn}`}>
            + Add New {cfg.title}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div id="smart-form" className={`bg-white rounded-2xl border-2 ${color.light} shadow-md overflow-hidden`}>
          <div className={`bg-gradient-to-r ${color.header} px-6 py-4 flex items-center justify-between`}>
            <div>
              <h2 className="text-white font-bold text-lg">
                {editRow ? `✏️ Edit ${cfg.title}` : `➕ New ${cfg.title} Entry`}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {editRow ? 'Update the record details below' : 'Fill in the details and submit'}
              </p>
            </div>
            <button onClick={handleCancel} className="text-white/80 hover:text-white text-2xl font-light">✕</button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {cfg.fields.map(fld => (
              <div key={fld.key} className={fld.span === 2 ? 'md:col-span-2' : ''}>
                <label className="form-label flex items-center gap-1.5">
                  {fld.label}
                  {fld.required && <span className="text-red-500">*</span>}
                  {fld.autoNote && <span className="text-gray-400 font-normal text-[10px] ml-1">✏️ {fld.autoNote}</span>}
                  {fld.readOnly && fld.type !== 'cpo' && <span className="text-gray-400 font-normal text-[10px] ml-1">(auto-calculated)</span>}
                </label>
                {renderField(fld)}
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className={`flex-1 text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${color.btn}`}>
              {saving ? 'Saving…' : editRow ? `✓ Update ${cfg.title}` : `✓ Create ${cfg.title}`}
            </button>
            <button onClick={handleCancel} className="btn-secondary px-8">Cancel</button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50/50">
          <h3 className="font-bold text-gray-700 text-sm">
            📊 All Records
            {countActiveFilters(appliedFilters) > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {countActiveFilters(appliedFilters)} {countActiveFilters(appliedFilters)>1?'filters':'filter'} active
              </span>
            )}
          </h3>
          <input className="form-input w-44 text-sm" placeholder="🔍 Search…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {filterConfig.length > 0 && (
          <div className="px-5 pt-4">
            <FilterPanel config={filterConfig} values={filterVals} onChange={handleFilterChange}
              onApply={handleFilterApply} onReset={handleFilterReset} activeCount={countActiveFilters(appliedFilters)} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th w-10">#</th>
                {cfg.tableFields.map(c => (
                  <th key={c} className="table-th">{c.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
                <th className="table-th text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={cfg.tableFields.length + 2} className="table-td text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading records…</span>
                  </div>
                </td></tr>
              )}
              {!loading && !rows.length && (
                <tr><td colSpan={cfg.tableFields.length + 2} className="table-td text-center py-16 text-gray-400">
                  <div className="text-4xl mb-2">📂</div>
                  <p className="font-semibold">No records yet</p>
                  {canAdd && <p className="text-xs mt-1">Click "+ Add New" to create your first entry</p>}
                </td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id}
                  className={`hover:bg-gray-50 transition-colors ${editRow?.id === row.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <td className="table-td text-gray-400 text-xs font-mono">{(page - 1) * PER_PAGE + i + 1}</td>
                  {cfg.tableFields.map(c => (
                    <td key={c} className="table-td max-w-[160px] truncate" title={fmt(row[c])}>
                      {c === 'status' ? <StatusBadge val={row[c]} /> : fmt(row[c])}
                    </td>
                  ))}
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => openEdit(row)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200 transition whitespace-nowrap">
                          ✏️ Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(row.id)}
                          className="flex items-center gap-1 text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition whitespace-nowrap">
                          🗑️ Delete
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-gray-400 italic">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} perPage={PER_PAGE} setPage={setPage} />
      </div>
    </div>
  );
}

// ── Generic module for enquiry / returns / sampling ───────────
function GenericModule({ title, apiPath }) {
  const { hasPermission } = useAuth();
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [filterVals,     setFilterVals]     = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});
  const PER_PAGE = 10;

  const filterConfig = FILTER_CONFIG[apiPath] || [];
  const modKey = apiPath === 'returns' ? 'return' : apiPath;
  const canAdd    = hasPermission(modKey, 'add');
  const canEdit   = hasPermission(modKey, 'edit');
  const canDelete = hasPermission(modKey, 'delete');

  const load = useCallback(() => {
    setLoading(true);
    const filterParams = filtersToParams(appliedFilters);
    api.get(`/${apiPath}`, { params: { page, limit: PER_PAGE, search, ...filterParams } })
      .then(r => { setRows(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [page, search, apiPath, appliedFilters]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (f, v) => setFilterVals(p => ({ ...p, [f]: v }));
  const handleFilterApply  = () => { setAppliedFilters({ ...filterVals }); setPage(1); };
  const handleFilterReset  = () => { setFilterVals({}); setAppliedFilters({}); setPage(1); };

  const openEdit = (row) => { setEditRow(row); setForm({ ...row }); setShowForm(true); };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editRow) { await api.put(`/${apiPath}/${editRow.id}`, form); toast.success('Updated!'); }
      else { await api.post(`/${apiPath}`, form); toast.success('Created!'); }
      setShowForm(false); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/${apiPath}/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const exclude = ['id', 'created_at', 'updated_at', 'created_by'];
  const cols = rows.length ? Object.keys(rows[0]).filter(k => !exclude.includes(k)) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">{title}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} total records · 10 per page</p>
        </div>
        <div className="flex gap-3">
          <input className="form-input w-56" placeholder="🔍 Search…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {canAdd && <button onClick={() => { setEditRow(null); setForm({}); setShowForm(true); }} className="btn-primary">+ Add New</button>}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-800">{editRow ? `Edit ${title}` : `New ${title}`}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">✕</button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {cols.map(c => (
              <div key={c} className={(c.includes('notes') || c.includes('reason') || c.includes('requirement')) ? 'col-span-2' : ''}>
                <label className="form-label">{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                {c === 'status' ? (
                  <select className="form-input" value={form[c] || ''} onChange={e => setForm(p => ({ ...p, [c]: e.target.value }))}>
                    <option value="">Select…</option>
                    {['pending', 'in_progress', 'completed', 'cancelled', 'new', 'follow_up', 'converted', 'closed', 'approved', 'rejected', 'processed', 'sent'].map(s => <option key={s}>{s}</option>)}
                  </select>
                ) : c.includes('date') ? (
                  <input type="date" className="form-input" value={form[c]?.split('T')[0] || ''} onChange={e => setForm(p => ({ ...p, [c]: e.target.value }))} />
                ) : (c.includes('notes') || c.includes('reason') || c.includes('requirement') || c.includes('feedback')) ? (
                  <textarea className="form-input" rows={3} value={form[c] || ''} onChange={e => setForm(p => ({ ...p, [c]: e.target.value }))} />
                ) : (
                  <input className="form-input" value={form[c] || ''} onChange={e => setForm(p => ({ ...p, [c]: e.target.value }))} placeholder={c.replace(/_/g, ' ')} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editRow ? 'Update Record' : 'Create Record'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50/50">
          <h3 className="font-bold text-gray-700 text-sm">
            📊 All Records
            {countActiveFilters(appliedFilters) > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {countActiveFilters(appliedFilters)} {countActiveFilters(appliedFilters)>1?'filters':'filter'} active
              </span>
            )}
          </h3>
          <div className="flex gap-2 items-center">
            <input className="form-input w-44 text-sm" placeholder="🔍 Search…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        {filterConfig.length > 0 && (
          <div className="px-5 pt-4">
            <FilterPanel config={filterConfig} values={filterVals} onChange={handleFilterChange}
              onApply={handleFilterApply} onReset={handleFilterReset} activeCount={countActiveFilters(appliedFilters)} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-th">#</th>
              {cols.slice(0, 6).map(c => <th key={c} className="table-th">{c.replace(/_/g, ' ').toUpperCase()}</th>)}
              <th className="table-th text-right">ACTIONS</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="table-td text-center py-12 text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading records…</span>
                </div>
              </td></tr>}
              {!loading && !rows.length && <tr><td colSpan={9} className="table-td text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📂</div>
                <p className="font-semibold">No records found</p>
              </td></tr>}
              {rows.map((row, i) => (
                <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${editRow?.id === row.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <td className="table-td text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                  {cols.slice(0, 6).map(c => (
                    <td key={c} className="table-td max-w-[140px] truncate">
                      {c === 'status' ? <StatusBadge val={row[c]} /> : fmt(row[c])}
                    </td>
                  ))}
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && <button onClick={() => openEdit(row)} className="text-xs text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200 whitespace-nowrap">✏️ Edit</button>}
                      {canDelete && <button onClick={() => handleDelete(row.id)} className="text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 whitespace-nowrap">🗑️ Delete</button>}
                      {!canEdit && !canDelete && <span className="text-xs text-gray-400 italic">View only</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} perPage={PER_PAGE} setPage={setPage} />
      </div>
    </div>
  );
}

// ── MAIN EXPORT ──────────────────────────────────────────────
export default function ModulePage({ title, apiPath, isMaster }) {
  if (isMaster) return <MasterDataModule />;
  const formCfg = FORMS[apiPath];
  if (!formCfg) return <GenericModule title={title} apiPath={apiPath} />;
  return <SmartModule cfg={formCfg} apiPath={apiPath} />;
}
