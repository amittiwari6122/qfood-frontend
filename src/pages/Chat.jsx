import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Languages } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Empty, PageHeader } from '../components/ui';
import i18n from '../i18n';

export default function Chat() {
  const { user } = useAuth();
  const { socket, online } = useRealtime();
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(null);
  const [translated, setTranslated] = useState({});
  const end = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    const load = () => api.get('/chat').then((r) => { setConvs(r.data); setActive((a) => a || r.data[0] || null); }).catch(() => {});
    load(); const t = setInterval(load, 10000); return () => clearInterval(t);
  }, []);
  const addMsg = (m) => setMsgs((p) => (p.some((x) => x._id === m._id) ? p : [...p, m]));
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    const pull = () => api.get(`/chat/${active._id}/messages`).then((r) => { if (alive) setMsgs((p) => (r.data.length === p.length && r.data.at(-1)?._id === p.at(-1)?._id ? p : r.data)); }).catch(() => {});
    setMsgs([]); pull();
    const poll = setInterval(pull, 3000); // safety net if the live socket is down
    if (!socket) return () => { alive = false; clearInterval(poll); };
    socket.emit('chat:join', active._id);
    const onMsg = (m) => m.conversation === active._id && addMsg(m);
    const onTyping = (t) => t.conversationId === active._id && setTyping(t.typing ? t.name : null);
    const rejoin = () => socket.emit('chat:join', active._id);
    socket.on('chat:message', onMsg); socket.on('chat:typing', onTyping); socket.on('connect', rejoin);
    return () => { alive = false; clearInterval(poll); socket.off('chat:message', onMsg); socket.off('chat:typing', onTyping); socket.off('connect', rejoin); };
  }, [active, socket]);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, typing]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !active) return;
    setText('');
    socket?.emit('chat:typing', { conversationId: active._id, typing: false });
    try { const { data } = await api.post(`/chat/${active._id}/messages`, { text: t }); addMsg(data); } catch { setText(t); }
  };
  const onType = (v) => {
    setText(v);
    socket?.emit('chat:typing', { conversationId: active._id, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('chat:typing', { conversationId: active._id, typing: false }), 1500);
  };
  const translate = async (m) => {
    const { data } = await api.post('/translate', { text: m.text, target: i18n.language || 'en' });
    setTranslated((t) => ({ ...t, [m._id]: data.provider === 'none' ? '(translation service not configured)' : data.text }));
  };

  if (!convs.length) return <><PageHeader title="Chat" /><Empty title="No conversations yet">A chat opens automatically between donor, NGO and delivery partner once a match is accepted.</Empty></>;
  const others = (c) => c.participants.filter((p) => p._id !== user._id);

  return (
    <div>
      <PageHeader title="Chat" />
      <div className="card grid h-[70vh] overflow-hidden md:grid-cols-[280px_1fr]">
        <ul className="hidden overflow-y-auto border-r border-sky-100 md:block">
          {convs.map((c) => (
            <li key={c._id}><button onClick={() => setActive(c)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${active?._id === c._id ? 'bg-sky-50' : 'hover:bg-sky-50/50'}`}>
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">{others(c)[0]?.name?.[0]}
                {others(c).some((p) => p.online || online.has(p._id)) && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{others(c).map((p) => p.name).join(', ')}</span><span className="block truncate text-xs text-ink-faint">{c.donation?.foodName}</span></span>
              {c.unread > 0 && <span className="rounded-full bg-sky-500 px-1.5 text-[10px] text-white">{c.unread}</span>}
            </button></li>
          ))}
        </ul>
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-sky-100 px-4 py-3"><p className="font-medium">{active && others(active).map((p) => p.name).join(', ')}</p><p className="text-xs text-ink-faint">{active?.donation?.foodName}</p></div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {msgs.map((m) => {
                const mine = (m.sender?._id || m.sender) === user._id;
                return (
                  <motion.div key={m._id} initial={{ opacity: 0, y: 8, x: mine ? 12 : -12 }} animate={{ opacity: 1, y: 0, x: 0 }} className={`flex ${mine ? 'justify-end' : ''}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-sky-500 text-white' : 'bg-sky-50'}`}>
                      {!mine && <p className="text-[11px] font-medium text-sky-700">{m.sender?.name}</p>}{m.text}
                      {translated[m._id] && <p className="mt-1 border-t border-current/20 pt-1 text-xs opacity-80">{translated[m._id]}</p>}
                      <p className={`mt-0.5 flex items-center gap-2 text-[10px] ${mine ? 'text-white/70' : 'text-ink-faint'}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {!mine && <button onClick={() => translate(m)} aria-label="Translate"><Languages className="h-3 w-3" /></button>}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {typing && <div className="flex items-center gap-1 px-1 text-xs text-ink-faint">{typing} is typing {[0, 1, 2].map((i) => <motion.span key={i} className="h-1 w-1 rounded-full bg-ink-faint" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />)}</div>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-sky-100 p-3">
            <input className="input" value={text} onChange={(e) => onType(e.target.value)} placeholder="Write a message" aria-label="Message" />
            <button className="btn-primary px-3" aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
