import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
    localStorage.removeItem('token'); sessionStorage.removeItem('token');
    if (!location.pathname.startsWith('/auth') && location.pathname !== '/') location.href = '/auth';
  }
  return Promise.reject(err);
});
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const fmtMinutes = (m) => {
  if (m <= 0) return 'Expired';
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return h ? `${h}h ${mm}m` : `${mm}m`;
};
