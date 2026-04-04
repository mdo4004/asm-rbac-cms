import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout       from './components/layout/AdminLayout';
import EmployeeLayout    from './components/layout/EmployeeLayout';
import LoginPage         from './pages/auth/LoginPage';
import AdminDashboard    from './pages/admin/Dashboard';
import ManageUsers       from './pages/admin/ManageUsers';
import AdminModule       from './pages/admin/AdminModule';
import LocationTrack     from './pages/admin/LocationTrack';
import EmployeeDashboard from './pages/employee/Dashboard';
import ModulePage        from './pages/employee/ModulePage';
import CustomerPOForm    from './pages/orders/CustomerPOForm';
import SupplierPO        from './pages/orders/SupplierPO';
import JobworkPO         from './pages/orders/JobworkPO';

const Protected = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400 text-lg">Loading…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role==='admin'?'/admin':'/employee'} replace />;
  return children;
};

const PermGuard = ({ module, children }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(module, 'view'))
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-gray-400">
        <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-sm mt-1">You don't have permission to view this module.</p>
      </div>
    );
  return children;
};
export { PermGuard };

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role==='admin'?'/admin':'/employee'}/> : <LoginPage />}/>

      {/* ── ADMIN ─────────────────────────────────────────── */}
      <Route path="/admin" element={<Protected role="admin"><AdminLayout /></Protected>}>
        <Route index                  element={<AdminDashboard />} />
        <Route path="users"           element={<ManageUsers />} />
        <Route path="location-track"  element={<LocationTrack />} />
        {/* New order pages */}
        <Route path="orders/cpo"      element={<CustomerPOForm />} />
        <Route path="orders/spo"      element={<SupplierPO />} />
        <Route path="orders/jpo"      element={<JobworkPO />} />
        {/* Legacy modules */}
        <Route path="customer-po"     element={<AdminModule title="Customer PO"    apiPath="customer-po" />} />
        <Route path="inward"          element={<AdminModule title="Inward Greige"  apiPath="inward" />} />
        <Route path="outward"         element={<AdminModule title="Outward Greige" apiPath="outward" />} />
        <Route path="jobwork"         element={<AdminModule title="Jobwork"        apiPath="jobwork" />} />
        <Route path="sales"           element={<AdminModule title="Sales"          apiPath="sales" />} />
        <Route path="enquiry"         element={<AdminModule title="Enquiry"        apiPath="enquiry" />} />
        <Route path="returns"         element={<AdminModule title="Returns"        apiPath="returns" />} />
        <Route path="sampling"        element={<AdminModule title="Sampling"       apiPath="sampling" />} />
        <Route path="master"          element={<AdminModule title="Master Data"    apiPath="master"  isMaster />} />
      </Route>

      {/* ── EMPLOYEE ──────────────────────────────────────── */}
      <Route path="/employee" element={<Protected role="employee"><EmployeeLayout /></Protected>}>
        <Route index element={<EmployeeDashboard />} />
        {/* Order pages — same UI as admin */}
        <Route path="orders/cpo" element={<PermGuard module="orders_cpo"><CustomerPOForm /></PermGuard>} />
        <Route path="orders/spo" element={<PermGuard module="orders_spo"><SupplierPO /></PermGuard>} />
        <Route path="orders/jpo" element={<PermGuard module="orders_jpo"><JobworkPO /></PermGuard>} />
        {/* Legacy modules */}
        <Route path="customer-po" element={<PermGuard module="customer_po"><ModulePage title="Customer PO"    apiPath="customer-po" /></PermGuard>} />
        <Route path="inward"      element={<PermGuard module="inward">     <ModulePage title="Inward Greige"  apiPath="inward" /></PermGuard>} />
        <Route path="outward"     element={<PermGuard module="outward">    <ModulePage title="Outward Greige" apiPath="outward" /></PermGuard>} />
        <Route path="jobwork"     element={<PermGuard module="jobwork">    <ModulePage title="Jobwork"        apiPath="jobwork" /></PermGuard>} />
        <Route path="sales"       element={<PermGuard module="sales">      <ModulePage title="Sales"          apiPath="sales" /></PermGuard>} />
        <Route path="enquiry"     element={<PermGuard module="enquiry">    <ModulePage title="Enquiry"        apiPath="enquiry" /></PermGuard>} />
        <Route path="returns"     element={<PermGuard module="return">     <ModulePage title="Returns"        apiPath="returns" /></PermGuard>} />
        <Route path="sampling"    element={<PermGuard module="sampling">   <ModulePage title="Sampling"       apiPath="sampling" /></PermGuard>} />
        <Route path="master"      element={<PermGuard module="master_data"><ModulePage title="Master Data"    apiPath="master"  isMaster /></PermGuard>} />
      </Route>

      <Route path="/"  element={user ? <Navigate to={user.role==='admin'?'/admin':'/employee'}/> : <Navigate to="/login"/>}/>
      <Route path="*"  element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
