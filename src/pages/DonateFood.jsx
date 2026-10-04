import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, LocateFixed, ScanEye, ShieldAlert, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { api, errMsg, fmtMinutes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Field, PageHeader, Spinner, StatusBadge } from '../components/ui';
import MapView from '../components/MapView';

const pad = (n) => String(n).padStart(2, '0');
const toDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const local = (d) => `${toDate(d)}T${toTime(d)}`;

export function AiResult({ ai, usableUntil }) {
  const cfg = { SAFE: ['Low-risk visual condition', 'text-emerald-600', CheckCircle2], CAUTION: ['Caution', 'text-amber-600', AlertTriangle],
    UNSAFE: ['High-risk visual condition', 'text-rose-600', ShieldAlert], MANUAL_REVIEW: ['Requires manual review', 'text-amber-600', Info] }[ai.status] || ['Not analysed', 'text-ink-faint', Info];
  const Icon = cfg[2];
  const mins = usableUntil ? (new Date(usableUntil) - Date.now()) / 60000 : null;
  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-violet-700"><ScanEye className="h-4 w-4" />AI food quality analysis</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div><p className="text-xs text-ink-faint">Quality</p><p className="text-2xl font-semibold">{ai.qualityScore != null ? `${ai.qualityScore}%` : '—'}</p></div>
        <div><p className="text-xs text-ink-faint">Confidence</p><p className="text-2xl font-semibold">{ai.confidence != null ? `${ai.confidence}%` : '—'}</p></div>
      </div>
      <p className={`mt-3 flex items-center gap-2 font-medium ${cfg[1]}`}><Icon className="h-4 w-4" />{cfg[0]}</p>
      {mins != null && <p className="mt-2 text-sm"><span className="text-ink-faint">Remaining usable time: </span>{fmtMinutes(mins)}</p>}
      {ai.indicators?.length > 0 && <ul className="mt-3 space-y-1 text-sm">{ai.indicators.map((i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 rounded-full bg-violet-400" />{i}</li>)}</ul>}
      <p className="mt-3 text-sm text-ink-soft">{ai.recommendation}</p>
      <p className="mt-3 text-[11px] text-ink-faint">{ai.mode === 'development' ? 'Development analysis mode — image measurements only.' : ai.mode === 'not_configured' ? 'AI model not configured.' : `Provider: ${ai.provider}${ai.model ? ` (${ai.model})` : ''}.`} Decision support only; safety rules and review still apply.</p>
    </div>
  );
}

export default function DonateFood() {
  const { user } = useAuth();
  const nav = useNavigate();
  const now = new Date();
  const [files, setFiles] = useState([]);
  const [pos, setPos] = useState(user.location?.coordinates?.[0] ? { lat: user.location.coordinates[1], lng: user.location.coordinates[0] } : null);
  const [stage, setStage] = useState('form'); // form | scanning | result
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: {
    category: 'cooked', isVeg: 'true', unit: 'meals', storageCondition: 'room_temp', address: user.address || '',
    preparedDate: toDate(now), preparedTime: toTime(new Date(now - 30 * 60000)),
    pickupStart: local(now), pickupEnd: local(new Date(+now + 2 * 36e5)),
  } });
  const uDate = watch('usableUntilDate'), uTime = watch('usableUntilTime');
  const usable = uDate && uTime ? new Date(`${uDate}T${uTime}`) : null;
  const mins = usable ? (usable - Date.now()) / 60000 : null;
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  const submit = async (v) => {
    setErr('');
    if (!pos) return setErr('Set the pickup location on the map or use your current location.');
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => val !== '' && val != null && fd.append(k, val));
    fd.set('pickupStart', new Date(v.pickupStart).toISOString()); fd.set('pickupEnd', new Date(v.pickupEnd).toISOString());
    fd.append('lat', pos.lat); fd.append('lng', pos.lng);
    files.forEach((f) => fd.append('images', f));
    setStage('scanning');
    try { const { data } = await api.post('/donations', fd); setResult(data); setStage('result'); }
    catch (e) { setErr(errMsg(e)); setStage('form'); }
  };

  if (stage !== 'form') return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={stage === 'scanning' ? 'Analysing your donation' : 'Donation listed'} />
      <Card className="overflow-hidden">
        <div className="relative mb-5 aspect-video overflow-hidden rounded-xl bg-violet-50">
          {files[0] ? <img src={URL.createObjectURL(files[0])} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-6xl">🍲</span>}
          {stage === 'scanning' && <>
            <span className="absolute inset-x-0 h-0.5 bg-violet-500 shadow-[0_0_20px_4px_#8B5CF6] animate-scan" />
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent" />
            {[...Array(10)].map((_, i) => <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300" style={{ left: `${10 + i * 8}%`, top: `${20 + ((i * 37) % 60)}%` }} animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.15 }} />)}
          </>}
        </div>
        <AnimatePresence mode="wait">
          {stage === 'scanning' ? (
            <motion.div key="s" exit={{ opacity: 0 }} className="flex items-center gap-3 text-sm text-violet-700"><Spinner className="h-4 w-4" />Checking freshness, spoilage and packaging…</motion.div>
          ) : (
            <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <AiResult ai={result.ai} usableUntil={result.usableUntil} />
              <p className="flex items-center gap-2 text-sm">Listing status: <StatusBadge status={result.status} /></p>
              <p className="text-sm text-ink-soft">{result.status === 'AVAILABLE' ? 'It is now in the quantum matching pool. You will be notified when an NGO is matched.'
                : result.status === 'PENDING_REVIEW' ? 'An admin will review it shortly. It enters matching once approved.' : 'This food cannot be listed for donation.'}</p>
              <div className="flex gap-2"><button className="btn-primary" onClick={() => nav('/app/donations')}>View my donations</button><button className="btn-outline" onClick={() => { setStage('form'); setFiles([]); }}>Donate more</button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <PageHeader title="Donate food" sub="Usable-until time is required. Food is removed from matching automatically when it expires." />
      {err && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{err}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="grid gap-4 sm:grid-cols-2">
            <h2 className="font-semibold sm:col-span-2">Food details</h2>
            <Field label="Food name" error={errors.foodName && 'Enter the food name'}><input className="input" {...register('foodName', { required: true })} /></Field>
            <Field label="Food type"><input className="input" placeholder="e.g. North Indian thali" {...register('foodType')} /></Field>
            <Field label="Category"><select className="input" {...register('category')}>{['cooked', 'bakery', 'produce', 'dairy', 'packaged', 'beverages', 'other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Veg / non-veg"><select className="input" {...register('isVeg')}><option value="true">Veg</option><option value="false">Non-veg</option></select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Quantity" error={errors.quantity && 'Required'}><input className="input" type="number" min="1" {...register('quantity', { required: true, min: 1 })} /></Field>
              <Field label="Unit"><select className="input" {...register('unit')}>{['meals', 'kg', 'packets', 'litres', 'boxes'].map((u) => <option key={u}>{u}</option>)}</select></Field></div>
            <Field label="People served"><input className="input" type="number" min="1" {...register('peopleServed')} /></Field>
            <Field label="Storage condition"><select className="input" {...register('storageCondition')}><option value="room_temp">Room temperature</option><option value="hot_holding">Kept hot</option><option value="refrigerated">Refrigerated</option><option value="frozen">Frozen</option></select></Field>
            <Field label="Packaging"><input className="input" placeholder="e.g. sealed foil trays" {...register('packaging')} /></Field>
            <Field label="Description"><textarea className="input sm:col-span-2" rows={2} {...register('description')} /></Field>
          </Card>
          <Card className="grid gap-4 sm:grid-cols-2">
            <h2 className="font-semibold sm:col-span-2">Timing</h2>
            <Field label="Prepared on"><input className="input" type="date" {...register('preparedDate', { required: true })} /></Field>
            <Field label="Prepared at"><input className="input" type="time" {...register('preparedTime', { required: true })} /></Field>
            <Field label="Usable until (date)" error={errors.usableUntilDate && 'Usable-until date is required'}><input className="input" type="date" {...register('usableUntilDate', { required: true })} /></Field>
            <Field label="Usable until (time)" error={errors.usableUntilTime && 'Usable-until time is required'}><input className="input" type="time" {...register('usableUntilTime', { required: true })} /></Field>
            {mins != null && (
              <p className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm font-medium ${mins <= 0 ? 'bg-rose-50 text-rose-700' : mins < 60 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                {mins <= 0 ? 'This time has already passed.' : `Food usable for: ${fmtMinutes(mins)}`}{mins > 0 && mins < 60 && ' — very little time left for delivery.'}
              </p>
            )}
            <Field label="Pickup from"><input className="input" type="datetime-local" {...register('pickupStart', { required: true })} /></Field>
            <Field label="Pickup until"><input className="input" type="datetime-local" {...register('pickupEnd', { required: true })} /></Field>
            <Field label="Limited-time sale price (optional)" hint="Leave empty to donate for free. A price lists it under food deals."><input className="input" type="number" min="1" placeholder="₹ per unit" {...register('forSalePrice')} /></Field>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Photos</h2>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 p-6 text-sm text-ink-faint hover:border-sky-300 hover:bg-sky-50">
              <ImagePlus className="h-6 w-6 text-sky-400" />Add up to 4 photos in good light
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles([...e.target.files].slice(0, 4))} />
            </label>
            {files.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{files.map((f) => <img key={f.name} src={URL.createObjectURL(f)} alt="" className="aspect-square rounded-lg object-cover" />)}</div>}
            <p className="mt-2 text-xs text-ink-faint">The first photo is screened by AI. Images are compressed before upload.</p>
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Pickup location</h2>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }))}><LocateFixed className="h-3.5 w-3.5" />Use current</button></div>
            <MapView height={220} markers={pos ? [{ ...pos, kind: 'pickup' }] : []} onPick={setPos} fit={false} />
            <p className="mt-2 text-xs text-ink-faint">Tap the map to set the exact pickup point.</p>
            <Field label="Address"><input className="input mt-3" {...register('address', { required: true })} /></Field>
          </Card>
          <button className="btn-primary w-full py-3">List donation</button>
        </div>
      </div>
    </form>
  );
}
