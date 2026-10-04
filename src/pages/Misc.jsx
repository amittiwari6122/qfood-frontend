import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, CheckCheck, ShieldCheck, Upload } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Countdown, Empty, Field, PageHeader, Spinner, StatusBadge } from '../components/ui';
import MapView from '../components/MapView';

export function Notifications() {
  const { notifications, markRead } = useRealtime();
  return (
    <div>
      <PageHeader title="Notifications" actions={notifications.some((n) => !n.read) && <button className="btn-outline" onClick={() => markRead()}><CheckCheck className="h-4 w-4" />Mark all read</button>} />
      {!notifications.length ? <Empty title="You're all caught up" /> : (
        <ul className="space-y-2">{notifications.map((n) => (
          <motion.li key={n._id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={`card flex items-start gap-3 p-4 ${n.read ? 'opacity-70' : ''}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-300' : 'bg-orange-400'}`} />
            <div className="flex-1"><p className="font-medium">{n.title}</p>{n.body && <p className="text-sm text-ink-soft">{n.body}</p>}<p className="mt-1 text-xs text-ink-faint">{new Date(n.createdAt).toLocaleString()}</p></div>
            {n.link && <Link to={n.link} onClick={() => markRead(n._id)} className="btn-ghost px-3 py-1 text-xs">Open</Link>}
          </motion.li>))}</ul>
      )}
    </div>
  );
}

export function Feedback() {
  const { user } = useAuth();
  const { toast } = useRealtime();
  const [done, setDone] = useState([]);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ rating: 5, foodCondition: 'GOOD', comment: '', public: false });
  const [target, setTarget] = useState(null);
  const load = () => {
    api.get('/deliveries').then((r) => setDone(r.data.filter((d) => d.status === 'DELIVERED')));
    api.get('/feedback/mine').then((r) => setMine(r.data));
  };
  useEffect(load, []);
  const given = new Set(mine.filter((f) => f.from?._id === user._id).map((f) => f.delivery));
  const submit = async () => {
    try { await api.post('/feedback', { ...form, deliveryId: target }); toast('Thanks for the feedback', '', 'success'); setTarget(null); load(); }
    catch (e) { toast('Could not send feedback', errMsg(e), 'error'); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageHeader title="Feedback" sub="Ratings keep donors and NGOs accountable. Reporting unsafe food flags the donor for admin review." />
        {!done.length ? <Empty title="No completed deliveries yet" /> : (
          <ul className="space-y-3">{done.map((d) => (
            <li key={d._id} className="card p-4">
              <div className="flex items-center justify-between gap-3"><p className="font-medium">{d.donation?.foodName}</p>
                {given.has(d._id) ? <span className="text-xs text-emerald-600">Feedback sent</span> : <button className="btn-outline px-3 py-1 text-xs" onClick={() => setTarget(target === d._id ? null : d._id)}>Rate</button>}</div>
              {target === d._id && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((i) => <button key={i} role="radio" aria-checked={form.rating === i} onClick={() => setForm({ ...form, rating: i })}><Star className={`h-7 w-7 ${i <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} /></button>)}</div>
                  {user.role !== 'DONOR' && <Field label="Food condition on arrival"><select className="input" value={form.foodCondition} onChange={(e) => setForm({ ...form, foodCondition: e.target.value })}><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="POOR">Poor</option><option value="UNSAFE">Unsafe — report to admin</option></select></Field>}
                  <textarea className="input" rows={3} placeholder="What went well, what didn't?" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-sky-500" checked={form.public} onChange={(e) => setForm({ ...form, public: e.target.checked })} />Show my comment on the public homepage</label>
                  <button className="btn-primary" onClick={submit}>Send feedback</button>
                </div>
              )}
            </li>))}</ul>
        )}
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Feedback about you</h2>
        {!mine.filter((f) => f.from?._id !== user._id).length ? <p className="text-sm text-ink-faint">None yet.</p> :
          <ul className="space-y-3">{mine.filter((f) => f.from?._id !== user._id).map((f) => <li key={f._id} className="border-b border-sky-50 pb-3 text-sm"><p className="flex gap-0.5">{[...Array(f.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</p><p className="mt-1">{f.comment}</p><p className="text-xs text-ink-faint">{f.from?.name}</p></li>)}</ul>}
      </Card>
    </div>
  );
}

export function Market() {
  const { toast } = useRealtime();
  const [list, setList] = useState(null);
  const load = () => api.get('/analytics/market').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const order = async (d) => {
    const q = +prompt(`How many ${d.unit}? (${d.quantity} left)`, '1');
    if (!q) return;
    try {
      const { data } = await api.post(`/analytics/market/${d._id}/order`, { quantity: q });
      toast('Order placed', data.payment.provider === 'none' ? `Pay ₹${data.order.amount} at pickup.` : 'Complete payment in the gateway window.', 'success');
      load();
    } catch (e) { toast('Order failed', errMsg(e), 'error'); }
  };
  if (!list) return <Spinner />;
  return (
    <div>
      <PageHeader title="Food deals" sub="Surplus food offered at a reduced price for a limited time, before it expires." />
      {!list.length ? <Empty title="No deals right now" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((d) => (
          <Card key={d._id}>
            <div className="flex items-start justify-between"><p className="font-semibold">{d.foodName}</p><p className="text-lg font-semibold text-emerald-600">₹{d.forSale.price}<span className="text-xs font-normal text-ink-faint">/{d.unit}</span></p></div>
            <p className="text-sm text-ink-faint">{d.quantity} {d.unit} left · {d.donor?.name}</p>
            <div className="mt-3 flex items-center justify-between"><Countdown until={d.usableUntil} /><button className="btn-primary px-3 py-1.5 text-xs" onClick={() => order(d)}><ShoppingBag className="h-3.5 w-3.5" />Order</button></div>
          </Card>))}</div>
      )}
    </div>
  );
}

export function Profile() {
  const { user, ngo, refresh, setUser } = useAuth();
  const { toast } = useRealtime();
  const [params] = useSearchParams();
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [form, setForm] = useState({ name: user.name, phone: user.phone, address: user.address || '', city: user.city || '', vehicle: user.vehicle || '' });
  const [pos, setPos] = useState(user.location?.coordinates?.[0] ? { lat: user.location.coordinates[1], lng: user.location.coordinates[0] } : null);
  const [ngoForm, setNgoForm] = useState({ operatingAreas: ngo?.operatingAreas?.join(', ') || '', foodRequirements: ngo?.foodRequirements?.join(', ') || '', vegOnly: ngo?.vegOnly || false });
  const [docs, setDocs] = useState([]);

  const save = async () => {
    try { const { data } = await api.patch('/users/me', { ...form, ...(pos || {}) }); setUser(data.user); toast('Profile saved', '', 'success'); }
    catch (e) { toast('Could not save', errMsg(e), 'error'); }
  };
  const sendOtp = async () => { const { data } = await api.post('/auth/otp/send'); setDevOtp(data.devOtp || null); toast('Code sent', 'Check your phone.'); };
  const verify = async () => { try { await api.post('/auth/otp/verify', { code }); await refresh(); toast('Phone verified', '', 'success'); } catch (e) { toast('Verification failed', errMsg(e), 'error'); } };
  const saveNgo = async () => {
    const fd = new FormData();
    Object.entries(ngoForm).forEach(([k, v]) => fd.append(k, v));
    docs.forEach((f) => fd.append('documents', f));
    try { await api.patch('/users/me/ngo', fd); await refresh(); setDocs([]); toast('NGO details saved', 'Documents go to the admin for review.', 'success'); } catch (e) { toast('Could not save', errMsg(e), 'error'); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PageHeader title="Profile" />
        {!user.phoneVerified && (
          <Card className={params.get('verify') ? 'ring-2 ring-sky-300' : ''}>
            <h2 className="font-semibold">Verify your phone</h2>
            <p className="mt-1 text-sm text-ink-faint">{['DONOR', 'BENEFICIARY'].includes(user.role) ? 'Verifying your phone verifies your account.' : 'Required before admin verification.'}</p>
            {devOtp && <p className="mt-2 text-sm">Development code: <b className="tracking-widest">{devOtp}</b></p>}
            <div className="mt-3 flex gap-2"><input className="input tracking-[.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
              <button className="btn-primary" disabled={code.length !== 6} onClick={verify}>Verify</button><button className="btn-outline" onClick={sendOtp}>Resend</button></div>
          </Card>
        )}
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2"><StatusBadge status={user.accountStatus} /><StatusBadge status={user.verificationStatus} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['name', 'phone', 'address', 'city'].map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>)}
            {user.role === 'DELIVERY' && <Field label="Vehicle"><input className="input" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></Field>}
          </div>
          <p className="text-xs text-ink-faint">Email {user.email} · Member since {new Date(user.createdAt).toLocaleDateString()} · Last sign-in {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</p>
          <button className="btn-primary" onClick={save}>Save profile</button>
        </Card>
      </div>
      <div className="space-y-6">
        <Card><h2 className="mb-3 font-semibold">Default location</h2><MapView height={240} markers={pos ? [{ ...pos, kind: 'pick' }] : []} onPick={setPos} fit={false} /><p className="mt-2 text-xs text-ink-faint">Tap the map, then save your profile.</p></Card>
        {user.role === 'NGO' && ngo && (
          <Card className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-semibold">{ngo.organizationName}</h2><StatusBadge status={ngo.verificationStatus} /></div>
            <p className="text-sm text-ink-faint">Registration {ngo.registrationNumber}</p>
            {ngo.verificationNotes && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{ngo.verificationNotes}</p>}
            <Field label="Operating areas" hint="Comma separated"><input className="input" value={ngoForm.operatingAreas} onChange={(e) => setNgoForm({ ...ngoForm, operatingAreas: e.target.value })} /></Field>
            <Field label="Food requirements" hint="Comma separated"><input className="input" value={ngoForm.foodRequirements} onChange={(e) => setNgoForm({ ...ngoForm, foodRequirements: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-sky-500" checked={ngoForm.vegOnly} onChange={(e) => setNgoForm({ ...ngoForm, vegOnly: e.target.checked })} />We only accept vegetarian food</label>
            <label className="btn-outline w-fit cursor-pointer"><Upload className="h-4 w-4" />Upload registration documents<input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => setDocs([...e.target.files])} /></label>
            {docs.length > 0 && <p className="text-xs">{docs.map((d) => d.name).join(', ')}</p>}
            {ngo.documents?.length > 0 && <ul className="text-xs">{ngo.documents.map((d) => <li key={d.url}><a href={d.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline"><ShieldCheck className="mr-1 inline h-3 w-3" />{d.name}</a></li>)}</ul>}
            <button className="btn-primary" onClick={saveNgo}>Save NGO details</button>
          </Card>
        )}
      </div>
    </div>
  );
}
