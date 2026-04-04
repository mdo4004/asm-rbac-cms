import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ label, value, color, icon }) => (
  <div className={`card border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-800">{value ?? '—'}</p>
      </div>
      <div className="text-3xl opacity-20">{icon}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/master/stats').then(r => setStats(r.data.stats)).catch(()=>{});
    api.get('/users').then(r => setUsers(r.data.users)).catch(()=>{});
  }, []);

  const modules = [
    { key:'customer_po', label:'Customer PO',   icon:'📋', color:'border-blue-500' },
    { key:'inward',      label:'Inward Greige',  icon:'📥', color:'border-green-500' },
    { key:'outward',     label:'Outward Greige', icon:'📤', color:'border-purple-500' },
    { key:'jobwork',     label:'Jobwork',         icon:'⚙️', color:'border-orange-500' },
    { key:'sales',       label:'Sales',           icon:'💰', color:'border-yellow-500' },
    { key:'enquiry',     label:'Enquiry',         icon:'❓', color:'border-pink-500' },
    { key:'returns',     label:'Returns',         icon:'↩️', color:'border-red-500' },
    { key:'sampling',    label:'Sampling',        icon:'🧪', color:'border-teal-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">Good day, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your business overview</p>
      </div>

      {/* Master stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={users.length} color="border-blue-500" icon="👤"/>
        <StatCard label="Customers"       value={stats?.customers} color="border-green-500" icon="🏢"/>
        <StatCard label="Qualities"       value={stats?.qualities} color="border-purple-500" icon="🧵"/>
        <StatCard label="Merchants"       value={stats?.merchants} color="border-orange-500" icon="🏪"/>
      </div>

      {/* Module record counts */}
      <div>
        <h2 className="text-lg font-bold text-gray-700 mb-3">Module Records</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map(m => (
            <StatCard key={m.key} label={m.label} value={stats?.[m.key]} color={m.color} icon={m.icon}/>
          ))}
        </div>
      </div>

      {/* Recent employees */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-700">Employees</h2>
          <a href="/admin/users" className="text-sm text-blue-600 font-semibold hover:underline">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Modules</th>
              <th className="table-th">Status</th>
            </tr></thead>
            <tbody>
              {users.slice(0,5).map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-td font-semibold">{u.name}</td>
                  <td className="table-td text-gray-500">{u.email}</td>
                  <td className="table-td">
                    <span className="text-xs text-blue-600 font-mono">
                      {u.allowed_modules || 'None'}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${u.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                      {u.is_active?'Active':'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={4} className="table-td text-center text-gray-400 py-8">No employees yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
