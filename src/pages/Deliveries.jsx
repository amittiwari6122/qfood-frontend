import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, MapPin, Navigation, KeyRound, Radio, AlertTriangle, PackageCheck } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Empty, PageHeader, Spinner, StatusBadge, Countdown } from '../components/ui';
import MapView from '../components/MapView';

const FLOW = ['AWAITING_PARTNER', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'];

export function Deliveries() {
  const { user, refresh } = useAuth();
  const { toast, socket } = useRealtime();
  const [mine, setMine] = useState(null);
  const [open, setOpen] = useState([]);
  const load = useCallback(() => {
    api.get('/deliveries').then((r) => setMine(r.data));
    if (user.role === 'DELIVERY') api.get('/deliveries/open').then((r) => setOpen(r.data));
  }, [user.role]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { socket?.on('delivery:new', load); socket?.on('notification', load); return () => { socket?.off('delivery:new', load); socket?.off('notification', load); }; }, [socket, load]);

  const toggle = async () => {
    const { data } = await api.patch('/users/me/availability', { available: !user.available });
    toast(data.user.available ? 'You are available' : 'You are offline', data.user.available ? 'New deliveries will reach you.' : 'You won\'t be matched to new deliveries.');
    await refresh(); load();
  };
  const claim = async (id) => { try { await api.post(`/deliveries/${id}/claim`); toast('Delivery assigned to you', '', 'success'); load(); } catch (e) { toast('Could not take delivery', errMsg(e), 'error'); } };

  if (!mine) return <Spinner />;
  return (
    <div>
      <PageHeader title="Deliveries" actions={user.role === 'DELIVERY' && (
        <button onClick={toggle} className={`btn ${user.available ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'btn-outline'}`}><Radio className="h-4 w-4" />{user.available ? 'Available' : 'Go available'}</button>)} />
      {user.role === 'DELIVERY' && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Waiting for a partner</h2>
          {!open.length ? <Empty title="No open deliveries">{user.available ? 'You will be notified when one comes in.' : 'Go available to receive new deliveries.'}</Empty> : (
            <div className="grid gap-4 md:grid-cols-2">{open.map((d) => (
              <Card key={d._id}>
                <p className="font-semibold">{d.donation?.foodName} · {d.donation?.quantity} {d.donation?.unit}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-faint"><MapPin className="h-3.5 w-3.5 text-orange-500" />{d.pickup.address}</p>
                <p className="flex items-center gap-1.5 text-sm text-ink-faint"><MapPin className="h-3.5 w-3.5 text-emerald-500" />{d.dropoff.address || d.recipient?.name}</p>
                <div className="mt-3 flex items-center gap-2"><Countdown until={d.donation?.usableUntil} compact /><span className="text-xs text-ink-faint">{d.route?.distanceKm} km · ~{d.route?.durationMin} min</span>
                  <button className="btn-primary ml-auto px-3 py-1.5 text-xs" onClick={() => claim(d._id)}>Take delivery</button></div>
              </Card>))}</div>
          )}
        </section>
      )}
      <h2 className="mb-3 font-semibold">{user.role === 'DELIVERY' ? 'My deliveries' : 'Deliveries'}</h2>
      {!mine.length ? <Empty title="No deliveries yet">Accepted matches turn into deliveries you can track live.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">{mine.map((d) => (
          <Link key={d._id} to={`/app/track/${d._id}`} className="card block p-5 transition hover:shadow-lift">
            <div className="flex items-start justify-between gap-3"><p className="font-semibold">{d.donation?.foodName}</p><StatusBadge status={d.status} /></div>
            <p className="mt-1 text-sm text-ink-faint">To {d.recipient?.name}{d.partner ? ` · by ${d.partner.name}` : ''}</p>
            <div className="mt-4 flex gap-1">{FLOW.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${FLOW.indexOf(d.status) >= i ? 'bg-sky-500' : 'bg-sky-100'}`} />)}</div>
          </Link>))}</div>
      )}
    </div>
  );
}

export function Track() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, toast } = useRealtime();
  const [d, setD] = useState(null);
  const [rider, setRider] = useState(null);
  const [trail, setTrail] = useState([]);
  const [code, setCode] = useState('');
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef(null);

  const load = useCallback(() => api.get(`/deliveries/${id}`).then((r) => {
    setD(r.data);
    const t = r.data.track || [];
    setTrail(t.map((p) => [p.lat, p.lng]));
    if (t.length) setRider(t[t.length - 1]);
  }), [id]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]); // polling keeps the map moving even if the socket is down
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('tracking:join', id);
    const onLoc = (p) => { if (p.deliveryId === id) { setRider(p); setTrail((t) => [...t, [p.lat, p.lng]]); } };
    const onUpd = (u) => { if (u.deliveryId === id) load(); };
    const rejoin = () => socket.emit('tracking:join', id);
    socket.on('tracking:location', onLoc); socket.on('delivery:update', onUpd); socket.on('connect', rejoin);
    return () => { socket.off('tracking:location', onLoc); socket.off('delivery:update', onUpd); socket.off('connect', rejoin); };
  }, [socket, id, load]);
  useEffect(() => () => watchRef.current && navigator.geolocation.clearWatch(watchRef.current), []);

  const share = () => {
    if (sharing) { navigator.geolocation.clearWatch(watchRef.current); setSharing(false); return; }
    if (!navigator.geolocation) return toast('Location unavailable', 'This browser cannot share location.', 'error');
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => api.post(`/deliveries/${id}/location`, { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {}),
      () => { toast('Location permission denied', 'Allow location access to share live tracking.', 'error'); setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 5000 });
    setSharing(true);
  };
  const self = async () => { try { await api.post(`/deliveries/${id}/self`); load(); } catch (e) { toast('Could not set this up', errMsg(e), 'error'); } };
  const act = async (path, body) => { try { await api.post(`/deliveries/${id}/${path}`, body); setCode(''); load(); } catch (e) { toast('Action failed', errMsg(e), 'error'); } };

  if (!d) return <Spinner />;
  const isPartner = d.partner?._id === user._id;
  const isRecipient = d.recipient?._id === user._id;
  const isDonor = !!d.pickupOtp; // only the donor is sent the pickup code
  const markers = [{ lat: d.pickup.lat, lng: d.pickup.lng, kind: 'pickup', label: 'Pickup' }, { lat: d.dropoff.lat, lng: d.dropoff.lng, kind: 'dropoff', label: 'Drop-off' }];
  if (rider) markers.push({ lat: rider.lat, lng: rider.lng, kind: 'rider', label: d.partner?.name });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <PageHeader title={`Delivery · ${d.donation?.foodName}`} sub={`${d.route?.distanceKm} km · about ${d.route?.durationMin} min (${d.route?.provider})`} />
        <MapView height={440} markers={markers} line={d.route?.geometry} trail={trail} />
        <div className="relative mt-4 h-10 overflow-hidden rounded-xl bg-white">
          <div className="absolute inset-y-[18px] left-6 right-6 border-t-2 border-dashed border-sky-200" />
          <motion.span className="absolute top-1.5 text-sky-600" animate={{ left: `${Math.min(92, (FLOW.indexOf(d.status) / 3) * 92)}%` }} transition={{ type: 'spring', stiffness: 60 }}><Truck className="h-7 w-7" /></motion.span>
        </div>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-semibold">Status</h2><StatusBadge status={d.status} /></div>
          <ol className="mt-4 space-y-3 border-l-2 border-sky-100 pl-4">
            {d.timeline.map((t, i) => <li key={i} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500" />{t.status.replace(/_/g, ' ').toLowerCase()}<span className="block text-xs text-ink-faint">{new Date(t.at).toLocaleTimeString()}{t.note ? ` · ${t.note}` : ''}</span></li>)}
          </ol>
        </Card>
        {d.pickupOtp && ['AWAITING_PARTNER', 'ASSIGNED'].includes(d.status) && <Card className="bg-orange-50"><p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-orange-500" />Pickup code — give this to the partner</p><p className="mt-2 text-3xl font-semibold tracking-[.4em]">{d.pickupOtp}</p></Card>}
        {d.dropoffOtp && d.status === 'IN_TRANSIT' && <Card className="bg-emerald-50"><p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-emerald-600" />Delivery code — give this when food arrives</p><p className="mt-2 text-3xl font-semibold tracking-[.4em]">{d.dropoffOtp}</p></Card>}
        {d.status === 'AWAITING_PARTNER' && (isRecipient || isDonor) && (
          <Card className="space-y-2 bg-sky-50">
            <p className="text-sm font-medium">Delivery partner is optional</p>
            <p className="text-xs text-ink-soft">{isRecipient ? 'You can wait for a delivery partner, or collect the food yourself if you are free. Use the chat to agree with the donor.' : 'You can wait for a delivery partner, or take the food to the NGO yourself if you are free. Use the chat to agree with them.'}</p>
            <button className="btn-primary w-full" onClick={self}>{isRecipient ? 'I will pick it up myself' : 'I will deliver it myself'}</button>
          </Card>
        )}
        {d.mode && d.mode !== 'PARTNER' && <p className="text-xs text-ink-faint">{d.mode === 'RECIPIENT_PICKUP' ? 'Self pickup by the receiving NGO' : 'Self delivery by the donor'}</p>}
        {isPartner && ['ASSIGNED', 'IN_TRANSIT'].includes(d.status) && (
          <Card className="space-y-3">
            <button className={`btn w-full ${sharing ? 'bg-sky-500 text-white' : 'btn-outline'}`} onClick={share}><Navigation className={`h-4 w-4 ${sharing ? 'animate-pulse' : ''}`} />{sharing ? 'Sharing live location' : 'Share live location'}</button>
            <label className="block"><span className="label">{d.status === 'ASSIGNED' ? 'Pickup code from donor' : 'Delivery code from recipient'}</span>
              <input className="input tracking-[.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
            <button className="btn-primary w-full" disabled={code.length !== 6} onClick={() => act(d.status === 'ASSIGNED' ? 'pickup' : 'deliver', { otp: code })}><PackageCheck className="h-4 w-4" />{d.status === 'ASSIGNED' ? 'Confirm pickup' : 'Confirm delivery'}</button>
            <button className="btn-ghost w-full text-rose-600" onClick={() => { const r = prompt('What went wrong?'); if (r) act('fail', { reason: r }); }}><AlertTriangle className="h-4 w-4" />Report a problem</button>
          </Card>
        )}
        {d.status === 'DELIVERED' && <Link to="/app/feedback" className="btn-primary w-full">Leave feedback</Link>}
      </div>
    </div>
  );
}
