import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

// Attach JWT — must use same key as AuthContext.jsx which does localStorage.setItem('token', ...)
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Handle 401 → clear token and redirect to login
// BUT skip redirect if we are already ON the login page (e.g. wrong credentials)
// so that the error toast in LoginPage.jsx can display properly.
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const onLoginPage = window.location.pathname === '/login';
      if (!onLoginPage) {
        // Session expired or token invalid — force logout
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
