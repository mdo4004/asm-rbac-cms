import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';

// ── ALL permission modules — includes CPO / SPO / JPO ────────
const ALL_MODULES = [
  { key:'orders_cpo',  label:'Customer PO',   icon:'📋', group:'Orders' },
  { key:'orders_spo',  label:'Supplier PO',   icon:'🛒', group:'Orders' },
  { key:'orders_jpo',  label:'Jobwork PO',    icon:'⚙️', group:'Orders' },
  { key:'inward',      label:'Inward',         icon:'📦', group:'Modules' },
  { key:'outward',     label:'Outward',        icon:'🚚', group:'Modules' },
  { key:'jobwork',     label:'Jobwork',        icon:'🔧', group:'Modules' },
  { key:'sales',       label:'Sales',          icon:'💰', group:'Modules' },
  { key:'enquiry',     label:'Enquiry',        icon:'💬', group:'Modules' },
  { key:'return',      label:'Returns',        icon:'↩️', group:'Modules' },
  { key:'sampling',    label:'Sampling',       icon:'🧪', group:'Modules' },
  { key:'master_data', label:'Master Data',   icon:'📂', group:'Settings' },
];

const ACTIONS = ['can_view','can_add','can_edit','can_delete'];
const ACTION_LABELS = { can_view:'View', can_add:'Add', can_edit:'Edit', can_delete:'Delete' };

const defaultPerms = () => Object.fromEntries(
  ALL_MODULES.map(m => [m.key, { can_view:false, can_add:false, can_edit:false, can_delete:false }])
);

export default function ManageUsers() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [perms,    setPerms]    = useState(defaultPerms());
  const [form,     setForm]     = useState({ name:'', email:'', password:'' });
  const [saving,   setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/users').then(r => setUsers(r.data.users||[])).catch(()=>setUsers([])).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditUser(null); setForm({ name:'', email:'', password:'' });
    setPerms(defaultPerms()); setShowForm(true);
  };

  const openEdit = async (u) => {
    try {
      const { data } = await api.get(`/users/${u.id}`);
      setEditUser(data.user);
      setForm({ name:data.user.name, email:data.user.email, password:'' });
      const loaded = defaultPerms();
      Object.entries(data.user.permissions||{}).forEach(([mod,p])=>{
        if (loaded[mod]) loaded[mod] = {
          can_view:   Boolean(p.can_view),
          can_add:    Boolean(p.can_add),
          can_edit:   Boolean(p.can_edit),
          can_delete: Boolean(p.can_delete),
        };
      });
      setPerms(loaded); setShowForm(true);
    } catch { toast.error('Failed to load user'); }
  };

  const handleSave = async () => {
    if (!form.name||!form.email) return toast.error('Name and email required');
    setSaving(true);
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, { ...form, is_active: editUser.is_active });
        await api.put(`/users/${editUser.id}/permissions`, { permissions: perms });
        toast.success('Employee updated');
      } else {
        if (!form.password) return toast.error('Password required');
        await api.post('/users', { ...form, permissions: perms });
        toast.success('Employee created');
      }
      setShowForm(false); load();
    } catch(e) { toast.error(e.response?.data?.message||'Error saving'); }
    finally { setSaving(false); }
  };

  const toggleAction = (mod, action) =>
    setPerms(p => ({ ...p, [mod]: { ...p[mod], [action]: !p[mod][action] } }));

  const toggleModule = (mod) => {
    const cur = perms[mod];
    const allOn = ACTIONS.every(a => cur[a]);
    setPerms(p => ({ ...p, [mod]: Object.fromEntries(ACTIONS.map(a => [a, !allOn])) }));
  };

  const setAllPerms = (val) => {
    const next = defaultPerms();
    ALL_MODULES.forEach(m => { ACTIONS.forEach(a => { next[m.key][a] = val; }); });
    setPerms(next);
  };

  const handleToggle = async (id) => {
    await api.patch(`/users/${id}/toggle`); toast.success('Status updated'); load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return;
    await api.delete(`/users/${id}`); toast.success('Deleted'); load();
  };

  // Group modules for display
  const groups = {};
  ALL_MODULES.forEach(m => { (groups[m.group] = groups[m.group]||[]).push(m); });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Manage Employees</h1>
          <p className="text-gray-500 text-sm mt-1">Create users and assign granular module permissions</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Add Employee</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Accessible Modules</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Actions</th>
            </tr></thead>
            <tbody>
              {loading&&<tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>}
              {!loading&&!users.length&&<tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No employees yet</td></tr>}
              {users.map(u=>(
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-td font-semibold text-gray-800">{u.name}</td>
                  <td className="table-td text-gray-500 text-sm">{u.email}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(u.allowed_modules||'').split(',').filter(Boolean).map(m=>(
                        <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100">
                          {ALL_MODULES.find(x=>x.key===m)?.label||m}
                        </span>
                      ))}
                      {!u.allowed_modules&&<span className="text-xs text-gray-400 italic">No access</span>}
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                      {u.is_active?'Active':'Inactive'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={()=>openEdit(u)} className="text-xs text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200">✏️ Edit</button>
                      <button onClick={()=>handleToggle(u.id)} className="text-xs text-yellow-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-yellow-50 border border-yellow-200">
                        {u.is_active?'Deactivate':'Activate'}
                      </button>
                      <button onClick={()=>handleDelete(u.id)} className="text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-red-200">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{editUser?'Edit Employee':'New Employee'}</h2>
              <p className="text-white/70 text-xs mt-0.5">Set details and configure granular permissions</p>
            </div>
            <button onClick={()=>setShowForm(false)} className="text-white/80 hover:text-white text-2xl font-light">✕</button>
          </div>

          {/* Basic info */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b">
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} placeholder="Employee name"
                onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" value={form.email} placeholder="email@company.com"
                onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
            </div>
            <div>
              <label className="form-label">{editUser?'New Password (leave blank to keep)':'Password *'}</label>
              <input type="password" className="form-input" value={form.password} placeholder="••••••••"
                onChange={e=>setForm(p=>({...p,password:e.target.value}))}/>
            </div>
          </div>

          {/* Permissions */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">Module Permissions</h3>
                <p className="text-xs text-gray-400 mt-0.5">Configure View / Add / Edit / Delete per module</p>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setAllPerms(true)} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg font-semibold hover:bg-green-100">✅ Grant All</button>
                <button onClick={()=>setAllPerms(false)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold hover:bg-red-100">🚫 Revoke All</button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-52">Module</th>
                    {ACTIONS.map(a=><th key={a} className="text-center px-4 py-3 font-semibold text-gray-600">{ACTION_LABELS[a]}</th>)}
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">All</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groups).map(([groupName, mods]) => (
                    <>
                      <tr key={`g-${groupName}`}>
                        <td colSpan={6} className="px-4 py-2 bg-gray-100 text-xs font-black text-gray-500 uppercase tracking-widest">
                          {groupName}
                        </td>
                      </tr>
                      {mods.map((mod,i)=>(
                        <tr key={mod.key} className={i%2===0?'bg-white':'bg-gray-50/40'}>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            <span className="flex items-center gap-2"><span>{mod.icon}</span>{mod.label}</span>
                          </td>
                          {ACTIONS.map(action=>(
                            <td key={action} className="text-center px-4 py-3">
                              <button
                                onClick={()=>toggleAction(mod.key,action)}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center mx-auto transition-all text-sm font-bold
                                  ${perms[mod.key]?.[action]
                                    ?'bg-blue-600 border-blue-600 text-white'
                                    :'bg-white border-gray-200 text-gray-300 hover:border-blue-300'}`}>
                                {perms[mod.key]?.[action]?'✓':''}
                              </button>
                            </td>
                          ))}
                          <td className="text-center px-4 py-3">
                            <button onClick={()=>toggleModule(mod.key)}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all
                                ${ACTIONS.every(a=>perms[mod.key]?.[a])
                                  ?'bg-green-100 text-green-700 border-green-200'
                                  :'bg-gray-100 text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                              {ACTIONS.every(a=>perms[mod.key]?.[a])?'All On':'Toggle'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving?'Saving…':editUser?'Update Employee':'Create Employee'}
            </button>
            <button onClick={()=>setShowForm(false)} className="btn-secondary px-8">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
