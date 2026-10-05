import { useEffect, useRef, useState } from 'react';
import { Send, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Empty, PageHeader } from '../components/ui';

const ROLE = { DONOR: 'Donor', NGO: 'NGO', BENEFICIARY: 'Needy person', DELIVERY: 'Delivery partner', WASTE_PARTNER: 'Waste partner', ADMIN: 'Admin' };
const arr = (x) => (Array.isArray(x) ? x : []);
const idOf = (x) => (x && typeof x === 'object' ? x._id : x);
const timeOf = (v) => { try { return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

export default function Chat() {
  const auth = useAuth() || {};
  const rt = useRealtime() || {};
  const user = auth.user || {};
  const socket = rt.socket && typeof rt.socket.on === 'function' ? rt.socket : null;
  const online = rt.online && typeof rt.online.has === 'function' ? rt.online : new Set();

  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(null);
  const end = useRef(null);
  const typingTimer = useRef(null);

  // conversation list (refreshes so a chat created after "claim"/"accept" shows up)
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/chat').then((r) => {
      if (!alive) return;
      const list = arr(r.data).filter((c) => c && c._id);
      setConvs(list);
      setActiveId((cur) => cur || (list[0] ? list[0]._id : null));
    }).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const addMsg = (m) => { if (!m) return; setMsgs((p) => (p.some((x) => x && x._id === m._id) ? p : p.concat([m]))); };

  // messages: poll every 3s (safety net) + live socket events
  useEffect(() => {
    if (!activeId) return undefined;
    let alive = true;
    const pull = () => api.get(`/chat/${activeId}/messages`).then((r) => {
      if (!alive) return;
      const list = arr(r.data);
      setMsgs((p) => (list.length === p.length && idOf(list[list.length - 1]) === idOf(p[p.length - 1]) ? p : list));
    }).catch(() => {});
    setMsgs([]);
    pull();
    const poll = setInterval(pull, 3000);
    const onMsg = (m) => { if (m && String(m.conversation) === String(activeId)) addMsg(m); };
    const onTyping = (t) => { if (t && String(t.conversationId) === String(activeId)) setTyping(t.typing ? t.name : null); };
    const rejoin = () => { socket.emit('chat:join', activeId); };
    if (socket) { socket.emit('chat:join', activeId); socket.on('chat:message', onMsg); socket.on('chat:typing', onTyping); socket.on('connect', rejoin); }
    return () => {
      alive = false; clearInterval(poll);
      if (socket) { socket.off('chat:message', onMsg); socket.off('chat:typing', onTyping); socket.off('connect', rejoin); }
    };
  }, [activeId, socket]);

  useEffect(() => {
    const el = end.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !activeId) return;
    setText('');
    if (socket) socket.emit('chat:typing', { conversationId: activeId, typing: false });
    try { const r = await api.post(`/chat/${activeId}/messages`, { text: t }); addMsg(r.data); } catch (err) { setText(t); }
  };
  const onType = (v) => {
    setText(v);
    if (!socket || !activeId) return;
    socket.emit('chat:typing', { conversationId: activeId, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('chat:typing', { conversationId: activeId, typing: false }), 1500);
  };

  const others = (c) => arr(c && c.participants).filter((p) => p && p._id !== user._id);
  const food = (c) => (c && c.donation && typeof c.donation === 'object'
    ? `${c.donation.foodName || 'Food'}${c.donation.quantity ? ` · ${c.donation.quantity} ${c.donation.unit || ''}` : ''}` : '');
  const active = convs.find((c) => c._id === activeId) || null;

  if (!convs.length) return <><PageHeader title="Chat" /><Empty title="No conversations yet">A chat opens automatically between donor, NGO and delivery partner once food is claimed or a match is accepted.</Empty></>;

  const names = others(active).map((p) => `${p.name || 'User'} (${ROLE[p.role] || p.role || ''})`).join(', ');
  const phones = others(active).filter((p) => p.phone).map((p) => p.phone).join(', ');
  const delivery = active && active.delivery && typeof active.delivery === 'object' ? active.delivery : null;

  return (
    <div>
      <PageHeader title="Chat" />
      <div className="card grid h-[70vh] overflow-hidden md:grid-cols-[280px_1fr]">
        <ul className="hidden overflow-y-auto border-r border-sky-100 md:block">
          {convs.map((c) => (
            <li key={c._id}><button type="button" onClick={() => setActiveId(c._id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${activeId === c._id ? 'bg-sky-50' : 'hover:bg-sky-50/50'}`}>
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">{String((others(c)[0] || {}).name || '?').charAt(0)}
                {others(c).some((p) => p.online || online.has(p._id)) && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{others(c).map((p) => p.name).join(', ') || 'Conversation'}</span><span className="block truncate text-xs text-ink-faint">{food(c)}</span></span>
              {c.unread > 0 && <span className="rounded-full bg-sky-500 px-1.5 text-[10px] text-white">{c.unread}</span>}
            </button></li>
          ))}
        </ul>
        <div className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-sky-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{names || 'Conversation'}</p>
              <p className="text-xs text-ink-faint">Food: {food(active) || '—'}{delivery && delivery.status ? ` · ${String(delivery.status).replace(/_/g, ' ').toLowerCase()}` : ''}</p>
              {phones && <p className="text-xs text-ink-faint">Phone: {phones}</p>}
            </div>
            {delivery && delivery._id && <Link to={`/app/track/${delivery._id}`} className="btn-outline px-3 py-1.5 text-xs"><Truck className="h-3.5 w-3.5" />Open delivery</Link>}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {msgs.filter(Boolean).map((m, i) => {
              const mine = idOf(m.sender) === user._id;
              const sender = m.sender && typeof m.sender === 'object' ? m.sender : {};
              return (
                <div key={m._id || i} className={`flex ${mine ? 'justify-end' : ''}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-sky-500 text-white' : 'bg-sky-50'}`}>
                    {!mine && sender.name && <p className="text-[11px] font-medium text-sky-700">{sender.name}</p>}
                    {String(m.text || '')}
                    <p className={`mt-0.5 text-[10px] ${mine ? 'text-white/70' : 'text-ink-faint'}`}>{timeOf(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            {typing && <div className="px-1 text-xs text-ink-faint">{typing} is typing…</div>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-sky-100 p-3">
            <input className="input" value={text} onChange={(e) => onType(e.target.value)} placeholder="Write a message" aria-label="Message" />
            <button type="submit" className="btn-primary px-3" aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
