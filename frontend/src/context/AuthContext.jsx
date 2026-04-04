import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchMe();
    else setLoading(false);
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // ── Permission helpers ────────────────────────────────────
  // Admin always has access to everything
  // For employees: check granular permission object
  // permissions shape: { module: { can_view, can_add, can_edit, can_delete } }

  const hasPermission = (module, action = 'view') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perm = user.permissions?.[module];
    if (!perm) return false;
    const map = { view:'can_view', add:'can_add', edit:'can_edit', delete:'can_delete' };
    return Boolean(perm[map[action] || 'can_view']);
  };

  // Legacy: can the user access the module at all (view)?
  const canAccess = (module) => hasPermission(module, 'view');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
