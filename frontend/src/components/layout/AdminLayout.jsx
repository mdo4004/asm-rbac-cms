import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  MdDashboard, MdPeople, MdAssignment, MdArrowDownward, MdArrowUpward,
  MdBuild, MdAttachMoney, MdQuestionAnswer, MdKeyboardReturn,
  MdScience, MdStorage, MdLogout, MdMenu, MdLocationOn, MdPerson,
  MdShoppingCart, MdFactory
} from 'react-icons/md';
import { useState } from 'react';
import ProfileModal from '../ProfileModal';
import LocationTrackerInit from '../LocationTrackerInit';

// ── Sidebar nav items ─────────────────────────────────────────
// null = horizontal divider, string = section label
const links = [
  { to:'/admin',              icon:<MdDashboard/>,     label:'Dashboard',     exact:true },
  { to:'/admin/users',        icon:<MdPeople/>,        label:'Manage Users' },
  { to:'/admin/location-track',icon:<MdLocationOn/>,  label:'Location Track' },

  '__ORDERS__',    // section label

  { to:'/admin/orders/cpo',   icon:<MdAssignment/>,   label:'Customer PO',   color:'text-indigo-600' },
  { to:'/admin/orders/spo',   icon:<MdShoppingCart/>,  label:'Supplier PO',   color:'text-emerald-600' },
  { to:'/admin/orders/jpo',   icon:<MdFactory/>,       label:'Jobwork PO',    color:'text-red-600' },

  '__MODULES__',   // section label

  { to:'/admin/inward',       icon:<MdArrowDownward/>, label:'Inward Greige' },
  { to:'/admin/outward',      icon:<MdArrowUpward/>,   label:'Outward Greige' },
  { to:'/admin/jobwork',      icon:<MdBuild/>,         label:'Jobwork' },
  { to:'/admin/sales',        icon:<MdAttachMoney/>,   label:'Sales' },
  { to:'/admin/enquiry',      icon:<MdQuestionAnswer/>,label:'Enquiry' },
  { to:'/admin/returns',      icon:<MdKeyboardReturn/>,label:'Returns' },
  { to:'/admin/sampling',     icon:<MdScience/>,       label:'Sampling' },

  null,

  { to:'/admin/master',       icon:<MdStorage/>,       label:'Master Data' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open,     setOpen]     = useState(false);
  const [profile,  setProfile]  = useState(false);
  const [dropdown, setDropdown] = useState(false);

  const handleLogout = () => { logout(); toast.info('Logged out'); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <LocationTrackerInit />

      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={()=>setOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col shadow-xl transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">ASM</div>
          <div>
            <p className="text-sm font-black text-gray-800">Ajantha Silk Mills</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">PVT LTD · UNIFIED SYSTEM</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {links.map((l, i) => {
            // null = divider
            if (l === null) return <div key={i} className="my-2 border-t border-gray-100"/>;
            // string = section label
            if (typeof l === 'string') {
              const label = l==='__ORDERS__' ? 'Orders' : l==='__MODULES__' ? 'Modules' : l;
              return <p key={i} className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 pt-3 pb-1">{label}</p>;
            }
            // link
            return (
              <NavLink key={l.to} to={l.to} end={l.exact}
                className={({isActive})=>`sidebar-link ${isActive?'active':''}`}
                onClick={()=>setOpen(false)}>
                <span className={`text-lg ${!l.exact && l.color ? l.color : ''}`}>{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-4">
          <button onClick={()=>setProfile(true)}
            className="flex items-center gap-3 w-full hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition group mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)||'A'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-blue-500 uppercase font-bold tracking-wide">Admin · View Profile</p>
            </div>
            <MdPerson className="text-gray-400 group-hover:text-blue-500 flex-shrink-0"/>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-1.5">
            <MdLogout className="text-base"/> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between bg-white border-b px-4 py-3 shadow-sm">
          <button onClick={()=>setOpen(true)} className="lg:hidden text-gray-600 text-xl"><MdMenu/></button>
          <span className="font-bold text-gray-800 lg:hidden">ASM Admin</span>
          <div className="hidden lg:flex items-center gap-2 ml-auto relative">
            <button onClick={()=>setDropdown(d=>!d)}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-full pl-2 pr-3 py-1 transition">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)||'A'}
              </div>
              <span className="text-sm font-semibold text-gray-700">{user?.name}</span>
            </button>
            {dropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl w-44 py-1 z-50">
                <button onClick={()=>{setProfile(true);setDropdown(false);}}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <MdPerson/> My Profile
                </button>
                <div className="border-t border-gray-100 my-1"/>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <MdLogout/> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" onClick={()=>setDropdown(false)}>
          <Outlet/>
        </main>
      </div>

      {profile && <ProfileModal onClose={()=>setProfile(false)}/>}
    </div>
  );
}
