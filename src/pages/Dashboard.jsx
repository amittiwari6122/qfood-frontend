import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle2, Users, Leaf, Sparkles, Truck, ClipboardList, Inbox, Route, AlertTriangle, ShieldCheck, Atom, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Stat, PageHeader, StatusBadge, Countdown, Empty } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const [s, setS] = useState({});
  const [list, setList] = useState([]);
  const [sys, setSys] = useState(null);
  useEffect(() => {
    api.get(user.role === 'ADMIN' ? '/analytics/admin' : '/analytics/me').then((r) => setS(r.data));
    if (user.role === 'DONOR') api.get('/donations/mine').then((r) => setList(r.data.slice(0, 5)));
    if (['NGO', 'BENEFICIARY'].includes(user.role)) api.get('/quantum/matches').then((r) => setList(r.data.slice(0, 5)));
    if (user.role === 'DELIVERY') api.get('/deliveries').then((r) => setList(r.data.slice(0, 5)));
    if (user.role === 'WASTE_PARTNER') api.get('/waste').then((r) => setList(r.data));
    api.get('/analytics/system').then((r) => setSys(r.data)).catch(() => {});
  }, [user.role]);

  const stats = {
    DONOR: [[Package, 'Total donations', s.total], [Sparkles, 'Matched', s.matched, 'violet'], [CheckCircle2, 'Completed', s.completed, 'green'], [Users, 'People served', s.peopleServed, 'green'], [Leaf, 'Food saved', s.foodSavedKg, 'green', ' kg'], [Clock, 'Awaiting review', s.pendingReview, 'amber']],
    NGO: [[ClipboardList, 'Open requests', s.openRequests], [Truck, 'Active deliveries', s.activeDeliveries, 'violet'], [CheckCircle2, 'Received', s.received, 'green'], [Inbox, 'Requests fulfilled', s.fulfilled, 'green']],
    BENEFICIARY: [[ClipboardList, 'Open requests', s.openRequests], [Truck, 'On the way', s.activeDeliveries, 'violet'], [CheckCircle2, 'Received', s.received, 'green']],
    DELIVERY: [[Truck, 'Active', s.active], [CheckCircle2, 'Delivered', s.delivered, 'green'], [Route, 'Distance covered', s.km, 'sky', ' km'], [AlertTriangle, 'Failed', s.failed, 'red']],
    WASTE_PARTNER: [[Package, 'Waiting for pickup', list.filter((w) => w.status === 'PENDING').length, 'amber'], [Truck, 'My active pickups', list.filter((w) => w.status === 'ACCEPTED').length, 'violet'], [CheckCircle2, 'Collected', list.filter((w) => w.status === 'COLLECTED').length, 'green']],
    ADMIN: [[ShieldCheck, 'NGOs to verify', s.pendingNgos, 'amber'], [AlertTriangle, 'Donations to review', s.pendingReview, 'amber'], [CheckCircle2, 'Rescue rate', s.rescueRate, 'green', '%'], [Atom, 'Recent quantum runs', s.runs?.length, 'violet']],
  }[user.role];

  return (
    <div>
      <PageHeader title="Overview" sub="Your activity at a glance"
        actions={user.role === 'DONOR' ? <Link to="/app/donate" className="btn-primary">Donate food</Link>
          : ['NGO', 'BENEFICIARY'].includes(user.role) ? <Link to="/app/requests" className="btn-primary">Request food</Link>
          : user.role === 'ADMIN' ? <Link to="/app/quantum" className="btn-quantum">Open quantum engine</Link>
          : user.role === 'WASTE_PARTNER' ? <Link to="/app/waste" className="btn-primary">View pickups</Link> : null} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stats.map(([i, l, v, t, suf]) => <Stat key={l} icon={i} label={l} value={v} tone={t} suffix={suf} />)}</div>

      {!['ADMIN', 'WASTE_PARTNER'].includes(user.role) && (
        <Card className="mt-6">
          <h2 className="mb-4 font-semibold">{user.role === 'DONOR' ? 'Recent donations' : user.role === 'DELIVERY' ? 'Your deliveries' : 'Latest quantum matches'}</h2>
          {!list.length ? <Empty title="Nothing here yet">{user.role === 'DONOR' ? 'List your first surplus food to see it here.' : 'New activity will appear here in real time.'}</Empty> : (
            <ul className="divide-y divide-sky-50">
              {list.map((x) => {
                const d = x.donationId || x.donation || x;
                return (
                  <li key={x._id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="flex-1 min-w-[10rem] font-medium">{d?.foodName || 'Donation'} <span className="text-sm font-normal text-ink-faint">· {d?.quantity} {d?.unit}</span></span>
                    {d?.usableUntil && <Countdown until={d.usableUntil} compact />}
                    <StatusBadge status={x.status || x.assignmentStatus} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {sys && (
        <Card className="mt-6">
          <h2 className="mb-3 font-semibold">Connected services</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p><span className="text-ink-faint">Quantum: </span>{sys.quantum.reachable ? `QAOA on ${sys.quantum.backend === 'aer_simulator' ? 'Qiskit Aer simulator' : sys.quantum.backend}` : 'service offline'}</p>
            <p><span className="text-ink-faint">Food AI: </span>{sys.ai.provider === 'dev' ? 'development analysis mode' : sys.ai.configured ? sys.ai.provider : 'AI model not configured'}</p>
            <p><span className="text-ink-faint">Storage: </span>{sys.storage.driver}</p>
            <p><span className="text-ink-faint">SMS: </span>{sys.sms}</p>
            <p><span className="text-ink-faint">Routing: </span>{sys.routing}</p>
            <p><span className="text-ink-faint">Payments: </span>{sys.payments}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
