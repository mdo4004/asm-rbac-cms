import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  MdDashboard, MdAssignment, MdArrowDownward, MdArrowUpward,
  MdBuild, MdAttachMoney, MdQuestionAnswer, MdKeyboardReturn,
  MdScience, MdStorage, MdLogout, MdMenu, MdPerson,
  MdShoppingCart, MdFactory
} from 'react-icons/md';
import { useState } from 'react';
import ProfileModal from '../ProfileModal';
import LocationTrackerInit from '../LocationTrackerInit';

const ALL_LINKS = [
  { to:'/employee',              module:null,          icon:<MdDashboard/>,     label:'Dashboard',      exact:true },
  null,
  // Orders section
  { to:'/employee/orders/cpo',   module:'orders_cpo',  icon:<MdAssignment/>,   label:'Customer PO',   color:'text-indigo-500' },
  { to:'/employee/orders/spo',   module:'orders_spo',  icon:<MdShoppingCart/>, label:'Supplier PO',   color:'text-emerald-500' },
  { to:'/employee/orders/jpo',   module:'orders_jpo',  icon:<MdFactory/>,      label:'Jobwork PO',    color:'text-red-500' },
  null,
  // Modules
  { to:'/employee/inward',       module:'inward',       icon:<MdArrowDownward/>, label:'Inward Greige' },
  { to:'/employee/outward',      module:'outward',      icon:<MdArrowUpward/>,   label:'Outward Greige' },
  { to:'/employee/jobwork',      module:'jobwork',      icon:<MdBuild/>,         label:'Jobwork' },
  { to:'/employee/sales',        module:'sales',        icon:<MdAttachMoney/>,   label:'Sales' },
  { to:'/employee/enquiry',      module:'enquiry',      icon:<MdQuestionAnswer/>,label:'Enquiry' },
  { to:'/employee/returns',      module:'return',       icon:<MdKeyboardReturn/>,label:'Returns' },
  { to:'/employee/sampling',     module:'sampling',     icon:<MdScience/>,       label:'Sampling' },
  { to:'/employee/master',       module:'master_data',  icon:<MdStorage/>,       label:'Master Data' },
];

export default function EmployeeLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate  = useNavigate();
  const [open,     setOpen]     = useState(false);
  const [profile,  setProfile]  = useState(false);
  const [dropdown, setDropdown] = useState(false);

  const handleLogout = () => { logout(); toast.info('Logged out'); navigate('/login'); };

  const visibleLinks = ALL_LINKS.filter(l =>
    l === null || l.module === null || hasPermission(l.module)
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <LocationTrackerInit />
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={()=>setOpen(false)}/>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col shadow-xl transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xs">ASM</div>
          <div>
            <p className="text-sm font-black text-gray-800">Ajantha Silk Mills</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">Employee Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {visibleLinks.map((l, i) =>
            !l ? <div key={i} className="my-2 border-t border-gray-100"/> :
            <NavLink key={l.to} to={l.to} end={l.exact}
              className={({isActive})=>`sidebar-link ${isActive?'active':''}`}
              onClick={()=>setOpen(false)}>
              <span className={`text-lg ${l.color||''}`}>{l.icon}</span>
              <span className="flex-1">{l.label}</span>
            </NavLink>
          )}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button onClick={()=>setProfile(true)}
            className="flex items-center gap-3 w-full hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition group mb-2">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)||'E'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-emerald-600 uppercase font-bold tracking-wide">Employee · Profile</p>
            </div>
            <MdPerson className="text-gray-400 group-hover:text-emerald-500 flex-shrink-0"/>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-1.5">
            <MdLogout className="text-base"/> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between bg-white border-b px-4 py-3 shadow-sm">
          <button onClick={()=>setOpen(true)} className="lg:hidden text-gray-600 text-xl"><MdMenu/></button>
          <span className="font-bold text-gray-800 lg:hidden">ASM Portal</span>
          <div className="hidden lg:flex items-center gap-2 ml-auto relative">
            <button onClick={()=>setDropdown(d=>!d)}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-full pl-2 pr-3 py-1 transition">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)||'E'}
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
