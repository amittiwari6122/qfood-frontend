import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ngo, setNgo] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { const { data } = await api.get('/auth/me'); setUser(data.user); setNgo(data.ngo); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('token') || sessionStorage.getItem('token')) refresh(); else setLoading(false);
  }, [refresh]);

  const saveToken = (token, remember) => {
    localStorage.removeItem('token'); sessionStorage.removeItem('token');
    (remember ? localStorage : sessionStorage).setItem('token', token);
  };
  const login = async (email, password, remember) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveToken(data.token, remember); setUser(data.user); await refresh(); return data.user;
  };
  const register = async (form) => {
    const { data } = await api.post('/auth/register', form);
    saveToken(data.token, true); setUser(data.user); await refresh(); return data;
  };
  const logout = () => { localStorage.removeItem('token'); sessionStorage.removeItem('token'); setUser(null); };

  return <Ctx.Provider value={{ user, ngo, loading, login, register, logout, refresh, setUser }}>{children}</Ctx.Provider>;
}
