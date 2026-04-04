import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/employee', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <span className="text-3xl">🏭</span>
          </div>
          <h1 className="text-3xl font-black text-white">Ajantha Silk Mills</h1>
          <p className="text-blue-200 text-sm mt-1 font-medium uppercase tracking-widest">Company Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@ajanthasilk.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 border-t pt-5 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-500">Demo Credentials:</p>
            <p>👑 Admin: <span className="font-mono">admin@ajanthasilk.com</span> / <span className="font-mono">Admin@123</span></p>
            <p>👤 Employee: <span className="font-mono">employee@ajanthasilk.com</span> / <span className="font-mono">Admin@123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
