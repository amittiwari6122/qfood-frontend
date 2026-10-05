import { useEffect, useState, useCallback } from 'react';
import { Recycle, MapPin, Phone, Leaf, Flame, Wheat } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Empty, PageHeader, Spinner, StatusBadge } from '../components/ui';

const METHOD = { COMPOST: ['Compost', Leaf], BIOGAS: ['Biogas', Flame], ANIMAL_FEED: ['Animal feed', Wheat] };

export default function Waste() {
  const { user } = useAuth();
  const { toast, socket } = useRealtime();
  const [list, setList] = useState(null);
  const load = useCallback(() => api.get('/waste').then((r) => setList(r.data)).catch(() => setList([])), []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { socket?.on('notification', load); return () => socket?.off('notification', load); }, [socket, load]);

  const act = async (id, path) => { try { await api.post(`/waste/${id}/${path}`); toast(path === 'accept' ? 'Pickup accepted' : 'Marked as collected', '', 'success'); load(); } catch (e) { toast('Action failed', errMsg(e), 'error'); } };
  if (!list) return <Spinner />;
  const isPartner = user.role === 'WASTE_PARTNER';
  const kg = list.filter((w) => w.status === 'COLLECTED').reduce((n, w) => n + (+w.quantity || 0), 0);

  return (
    <div>
      <PageHeader title="Waste management" sub={isPartner ? 'Collect surplus food that could not be matched in time' : 'Food that expired without an NGO match is sent here instead of landfill'} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs text-ink-faint">Waiting for pickup</p><p className="mt-1 text-2xl font-semibold">{list.filter((w) => w.status === 'PENDING').length}</p></Card>
        <Card><p className="text-xs text-ink-faint">On the way</p><p className="mt-1 text-2xl font-semibold">{list.filter((w) => w.status === 'ACCEPTED').length}</p></Card>
        <Card><p className="text-xs text-ink-faint">Collected (portions)</p><p className="mt-1 text-2xl font-semibold">{kg}</p></Card>
      </div>
      {!list.length ? <Empty title="No waste pickups">{isPartner ? 'New pickups appear here when food expires without a match.' : 'When your food expires without a match, it is routed here automatically.'}</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((w) => {
            const [label, Icon] = METHOD[w.method] || METHOD.COMPOST;
            return (
              <Card key={w._id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{w.foodName} <span className="text-sm font-normal text-ink-faint">· {w.quantity} {w.unit}</span></p>
                  <StatusBadge status={w.status} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-faint"><MapPin className="h-3.5 w-3.5 text-orange-500" />{w.address || 'Donor location'}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-faint"><Icon className="h-3.5 w-3.5 text-emerald-600" />Suggested use: {label}</p>
                <p className="mt-1 text-xs text-ink-faint">{w.reason}</p>
                {w.donor && (isPartner || user.role === 'ADMIN') && <p className="mt-1 flex items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5" />{w.donor.name} · {w.donor.phone}</p>}
                {w.collector && <p className="mt-1 flex items-center gap-1.5 text-sm"><Recycle className="h-3.5 w-3.5 text-emerald-600" />Collected by {w.collector.name}{w.collector.phone ? ` · ${w.collector.phone}` : ''}</p>}
                {isPartner && w.status === 'PENDING' && <button className="btn-primary mt-3 w-full" onClick={() => act(w._id, 'accept')}>Take this pickup</button>}
                {isPartner && w.status === 'ACCEPTED' && w.collector?._id === user._id && <button className="btn-primary mt-3 w-full" onClick={() => act(w._id, 'collected')}>Mark as collected</button>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
