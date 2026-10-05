import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Drumstick, MapPin, Gauge, Clock, Atom, Check, X, Plus } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Countdown, Empty, Field, PageHeader, StatusBadge, Spinner } from '../components/ui';
import MapView from '../components/MapView';
import { AiResult } from './DonateFood';

const FoodCard = ({ d, children }) => (
  <Card className="flex flex-col gap-3">
    <div className="flex gap-3">
      {d.images?.[0] ? <img src={d.images[0].url} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-xl bg-orange-50 text-2xl">🍲</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{d.foodName}</p>
        <p className="text-sm text-ink-faint">{d.quantity} {d.unit} · {d.category}</p>
        <p className="mt-1 flex items-center gap-1 text-xs">{d.isVeg ? <><Leaf className="h-3 w-3 text-emerald-600" />Veg</> : <><Drumstick className="h-3 w-3 text-rose-500" />Non-veg</>}</p>
      </div>
      <StatusBadge status={d.status} />
    </div>
    <div className="flex flex-wrap items-center gap-2"><Countdown until={d.usableUntil} />{d.ai?.status && d.ai.status !== 'NOT_ANALYZED' && <StatusBadge status={d.ai.status} />}</div>
    {children}
  </Card>
);

export function MyDonations() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => api.get('/donations/mine').then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const cancel = async (id) => { if (confirm('Cancel this donation?')) { await api.post(`/donations/${id}/cancel`); load(); } };
  const changeQty = async (d) => { const q = prompt('New quantity', d.quantity); if (q) { await api.patch(`/donations/${d._id}`, { quantity: +q }); load(); } };
  if (!list) return <Spinner />;
  return (
    <div>
      <PageHeader title="My donations" actions={<Link to="/app/donate" className="btn-primary"><Plus className="h-4 w-4" />Donate food</Link>} />
      {!list.length ? <Empty title="No donations yet" action={<Link to="/app/donate" className="btn-primary">Donate food</Link>}>Your listings and their matching status will show here.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <FoodCard key={d._id} d={d}>
              {d.matchedNgo && <p className="text-sm"><span className="text-ink-faint">Matched to </span>{d.matchedNgo.name}</p>}
              {d.manualReview?.notes && d.status === 'PENDING_REVIEW' && <p className="text-xs text-amber-700">{d.manualReview.notes}</p>}
              <div className="flex flex-wrap gap-2">
                <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setOpen(open === d._id ? null : d._id)}>AI analysis</button>
                {['AVAILABLE', 'PENDING_REVIEW', 'MATCHED'].includes(d.status) && <><button className="btn-outline px-3 py-1.5 text-xs" onClick={() => changeQty(d)}>Change quantity</button>
                  <button className="btn-ghost px-3 py-1.5 text-xs text-rose-600" onClick={() => cancel(d._id)}>Cancel</button></>}
              </div>
              {open === d._id && <AiResult ai={d.ai} usableUntil={d.usableUntil} />}
            </FoodCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function Available() {
  const { user } = useAuth();
  const { toast, socket } = useRealtime();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => api.get('/donations/available').then((r) => setList(r.data)).catch(() => setList((l) => l || [])), []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  useEffect(() => { socket?.on('notification', load); return () => socket?.off('notification', load); }, [socket, load]);
  const claim = async (d) => {
    setBusy(d._id);
    try { const { data } = await api.post(`/donations/${d._id}/claim`, {}); toast('Food is yours!', 'Arrange pickup: wait for a delivery partner, or collect it yourself.', 'success'); nav(`/app/track/${data.delivery._id}`); }
    catch (e) { toast('Could not claim', errMsg(e), 'error'); load(); } finally { setBusy(null); }
  };
  if (!list) return <Spinner />;
  const canClaim = ['NGO', 'BENEFICIARY'].includes(user.role);
  return (
    <div>
      <PageHeader title="Available food" sub="First come, first served. Claim food the moment it is listed, or let the quantum engine match it for you." />
      {!list.length ? <Empty title="No food available right now">New donations appear here as soon as they are listed, and you get a notification.</Empty> : (
        <>
          <MapView height={300} markers={list.map((d) => ({ lat: d.location.coordinates[1], lng: d.location.coordinates[0], kind: 'pickup', label: `${d.foodName} · ${d.quantity} ${d.unit}` }))} />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((d) => (
            <FoodCard key={d._id} d={d}>
              <p className="text-xs text-ink-faint">From {d.donor?.name}, {d.donor?.city}</p>
              {canClaim && <button className="btn-primary w-full" disabled={busy === d._id} onClick={() => claim(d)}>{busy === d._id ? 'Claiming…' : 'Claim this food'}</button>}
            </FoodCard>))}</div>
        </>
      )}
    </div>
  );
}

export function Requests() {
  const { user } = useAuth();
  const { toast } = useRealtime();
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(user.location?.coordinates?.[0] ? { lat: user.location.coordinates[1], lng: user.location.coordinates[0] } : null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { categories: ['cooked'], priority: 'NORMAL', address: user.address } });
  const load = () => api.get('/requests/mine').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const submit = async (v) => {
    if (!pos) return toast('Set a delivery location', 'Tap the map to choose where food should go.', 'warn');
    try {
      await api.post('/requests', { ...v, categories: [].concat(v.categories), requiredBefore: new Date(v.requiredBefore).toISOString(), lat: pos.lat, lng: pos.lng, vegOnly: !!v.vegOnly });
      toast('Request created', 'It joins the next quantum matching run.', 'success'); reset(); setShow(false); load();
    } catch (e) { toast('Could not create request', errMsg(e), 'error'); }
  };
  const cancel = async (id) => { await api.patch(`/requests/${id}`, { status: 'CANCELLED' }); load(); };
  return (
    <div>
      <PageHeader title="Food requests" sub="Required-before time is mandatory so urgent needs are prioritised." actions={<button className="btn-primary" onClick={() => setShow(!show)}><Plus className="h-4 w-4" />Create food request</button>} />
      {show && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit(submit)} className="card mb-6 grid gap-4 p-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Food required" error={errors.foodRequired && 'Describe the food'}><input className="input" placeholder="e.g. dinner for 60 children" {...register('foodRequired', { required: true })} /></Field>
            <Field label="Accepted categories"><select multiple className="input h-[84px]" {...register('categories')}>{['any', 'cooked', 'bakery', 'produce', 'dairy', 'packaged', 'beverages'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Quantity" error={errors.quantity && 'Required'} hint={user.role === 'BENEFICIARY' ? 'Up to 20 portions for individuals' : undefined}><input className="input" type="number" min="1" {...register('quantity', { required: true })} /></Field>
            <Field label="Number of beneficiaries"><input className="input" type="number" min="1" {...register('beneficiaries', { required: true })} /></Field>
            <Field label="Required before" error={errors.requiredBefore && 'Required-before date and time is mandatory'}><input className="input" type="datetime-local" {...register('requiredBefore', { required: true })} /></Field>
            {user.role === 'NGO' && <Field label="Priority"><select className="input" {...register('priority')}><option>NORMAL</option><option>HIGH</option><option>CRITICAL</option></select></Field>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-sky-500" {...register('vegOnly')} />Vegetarian food only</label>
            <Field label="Description"><textarea className="input" rows={2} {...register('description')} /></Field>
          </div>
          <div><span className="label">Delivery location</span><MapView height={230} markers={pos ? [{ ...pos, kind: 'dropoff' }] : []} onPick={setPos} fit={false} />
            <Field label="Address"><input className="input mt-3" {...register('address')} /></Field>
            <button className="btn-primary mt-4 w-full" disabled={isSubmitting}>Create food request</button></div>
        </motion.form>
      )}
      {!list.length ? <Empty title="No requests yet">Create a request so the quantum engine can match food to you.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <Card key={r._id}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{r.foodRequired}</p><p className="text-sm text-ink-faint">{r.fulfilledQuantity}/{r.quantity} received · {r.beneficiaries} people</p></div><StatusBadge status={r.status} /></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-100"><motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (r.fulfilledQuantity / r.quantity) * 100)}%` }} /></div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><Countdown until={r.requiredBefore} compact /><StatusBadge status={r.priority} />
                {['OPEN', 'PARTIALLY_FULFILLED'].includes(r.status) && <button className="btn-ghost ml-auto px-2 py-1 text-xs text-rose-600" onClick={() => cancel(r._id)}>Cancel</button>}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function Matches() {
  const { socket, toast } = useRealtime();
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => api.get('/quantum/matches').then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { socket?.on('notification', load); return () => socket?.off('notification', load); }, [socket, load]);
  const act = async (id, action) => {
    setBusy(id);
    try {
      const reason = action === 'reject' ? prompt('Why are you declining? (optional)') ?? '' : undefined;
      await api.post(`/quantum/matches/${id}/${action}`, { reason });
      toast(action === 'accept' ? 'Match accepted' : 'Match declined', action === 'accept' ? 'A delivery partner is being assigned.' : 'The engine will rematch this food.', action === 'accept' ? 'success' : 'info');
    } catch (e) { toast('Action failed', errMsg(e), 'error'); }
    setBusy(null); load();
  };
  if (!list) return <Spinner />;
  return (
    <div>
      <PageHeader title="Quantum matches" sub="Food the QAOA engine assigned to you. Matches expire if not accepted within 20 minutes." />
      {user.verificationStatus !== 'VERIFIED' && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your account is not verified yet, so you won't receive matches. {user.role === 'NGO' ? 'An admin is reviewing your NGO documents.' : 'Verify your phone in your profile.'}</p>}
      {!list.length ? <Empty title="No matches yet">When the engine finds food that fits your requests, it appears here instantly.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((m) => {
            const d = m.donationId;
            return (
              <motion.div key={m._id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card anim-border p-5">
                <p className="flex items-center gap-2 text-xs font-medium text-violet-600"><Atom className="h-3.5 w-3.5" />Quantum match found</p>
                <p className="mt-2 text-lg font-semibold">{d?.quantity} {d?.unit} · {d?.foodName}</p>
                <p className="text-sm text-ink-faint">From {d?.donor?.name} · for “{m.requestId?.foodRequired}”</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <p><MapPin className="mb-1 h-4 w-4 text-sky-500" />{m.distance?.toFixed(1)} km</p>
                  <p><Gauge className="mb-1 h-4 w-4 text-violet-500" />{Math.round((m.foodQuality || 0) * 100)}% quality</p>
                  <p><Clock className="mb-1 h-4 w-4 text-amber-500" />~{Math.round(m.deliveryTime)} min trip</p>
                </div>
                <div className="mt-4 flex items-center gap-2">{d?.usableUntil && <Countdown until={d.usableUntil} />}<StatusBadge status={m.assignmentStatus} /></div>
                {m.assignmentStatus === 'PROPOSED' && (
                  <div className="mt-4 flex gap-2">
                    <button className="btn-primary flex-1 bg-emerald-500 hover:bg-emerald-600" disabled={busy === m._id} onClick={() => act(m._id, 'accept')}><Check className="h-4 w-4" />Accept</button>
                    <button className="btn-outline flex-1" disabled={busy === m._id} onClick={() => act(m._id, 'reject')}><X className="h-4 w-4" />Decline</button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
