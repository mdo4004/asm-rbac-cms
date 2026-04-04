import { useAuth } from '../../context/AuthContext';

const MODULE_META = {
  customer_po: { label:'Customer PO',   icon:'📋', path:'/employee/customer-po', color:'bg-blue-50 border-blue-200 text-blue-700' },
  inward:      { label:'Inward Greige', icon:'📥', path:'/employee/inward',       color:'bg-green-50 border-green-200 text-green-700' },
  outward:     { label:'Outward Greige',icon:'📤', path:'/employee/outward',      color:'bg-purple-50 border-purple-200 text-purple-700' },
  jobwork:     { label:'Jobwork',        icon:'⚙️', path:'/employee/jobwork',     color:'bg-orange-50 border-orange-200 text-orange-700' },
  sales:       { label:'Sales',          icon:'💰', path:'/employee/sales',        color:'bg-yellow-50 border-yellow-200 text-yellow-700' },
  enquiry:     { label:'Enquiry',        icon:'❓', path:'/employee/enquiry',      color:'bg-pink-50 border-pink-200 text-pink-700' },
  return:      { label:'Returns',        icon:'↩️', path:'/employee/returns',      color:'bg-red-50 border-red-200 text-red-700' },
  sampling:    { label:'Sampling',       icon:'🧪', path:'/employee/sampling',    color:'bg-teal-50 border-teal-200 text-teal-700' },
  master_data: { label:'Master Data',    icon:'🗂️', path:'/employee/master',      color:'bg-gray-50 border-gray-200 text-gray-700' },
};

export default function EmployeeDashboard() {
  const { user, hasPermission } = useAuth();
  const accessible = Object.entries(MODULE_META).filter(([k]) => hasPermission(k));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">Welcome, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Your accessible modules are shown below.</p>
      </div>

      {accessible.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-xl font-bold text-gray-700">No modules assigned</p>
          <p className="text-gray-400 text-sm mt-2">Contact your administrator to get access to modules.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-400 mb-3 font-medium">You have access to {accessible.length} module{accessible.length!==1?'s':''}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {accessible.map(([key, meta]) => (
              <a key={key} href={meta.path}
                className={`card flex flex-col items-center justify-center py-8 text-center border-2 hover:scale-105 transition-transform cursor-pointer ${meta.color}`}>
                <span className="text-4xl mb-3">{meta.icon}</span>
                <span className="font-bold text-sm">{meta.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
