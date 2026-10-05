import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { api, BACKEND_URL } from '../lib/api';

const Ctx = createContext(null);
export const useRealtime = () => useContext(Ctx);

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [online, setOnline] = useState(new Set());
  const [ring, setRing] = useState(0);
  const idRef = useRef(0);

  const toast = useCallback((title, body, tone = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, title, body, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    api.get('/notifications').then(({ data }) => setNotifications(data)).catch(() => {});
    const s = io(BACKEND_URL, { auth: { token: localStorage.getItem('token') || sessionStorage.getItem('token') }, transports: ['websocket', 'polling'] });
    s.on('notification', (n) => { setNotifications((p) => [n, ...p]); setRing((r) => r + 1); toast(n.title, n.body); });
    s.on('presence', ({ userId, online: on }) => setOnline((p) => { const x = new Set(p); on ? x.add(userId) : x.delete(userId); return x; }));
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [user, toast]);

  const markRead = async (id) => {
    await api.post('/notifications/read', id ? { id } : {});
    setNotifications((p) => p.map((n) => (!id || n._id === id ? { ...n, read: true } : n)));
  };

  const tones = { info: 'border-sky-300', success: 'border-emerald-400', error: 'border-rose-400', warn: 'border-amber-400' };
  return (
    <Ctx.Provider value={{ socket, notifications, markRead, toast, online, ring }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }}
              className={`glass rounded-2xl border-l-4 ${tones[t.tone]} p-3.5 flex gap-3`}>
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{t.title}</p>{t.body && <p className="text-xs text-ink-soft mt-0.5">{t.body}</p>}</div>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss"><X className="h-4 w-4 text-ink-faint" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
