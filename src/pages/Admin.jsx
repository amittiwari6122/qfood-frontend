import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Empty, PageHeader, Spinner, StatusBadge, Countdown } from '../components/ui';
import { AiResult } from './DonateFood';

const TABS = [['ngos', 'NGO verification'], ['review', 'Donation review'], ['users', 'Users'], ['audit', 'Audit log']];

export function Admin() {
  const { toast, socket } = useRealtime();
  const [tab, setTab] = useState('ngos');
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const load = () => {
    setData(null);
    const url = { ngos: `/users/ngos${filter ? `?status=${filter}` : ''}`, review: '/donations/review-queue', users: `/users${filter ? `?q=${filter}` : ''}`, audit: '/users/audit' }[tab];
    api.get(url).then((r) => setData(r.data));
  };
  useEffect(load, [tab, filter]); // eslint-disable-line
  useEffect(() => { socket?.on('review:new', load); return () => socket?.off('review:new', load); }); // eslint-disable-line

  const act = async (fn, msg) => { try { await fn(); toast(msg, '', 'success'); load(); } catch (e) { toast('Action failed', errMsg(e), 'error'); } };
  const ngoAct = (id, action) => { const notes = action === 'APPROVE' ? '' : prompt('Note for the NGO (shown to them)') ?? ''; act(() => api.patch(`/users/ngos/${id}/verify`, { action, notes }), `NGO ${action.toLowerCase().replace('_', ' ')}`); };

  return (
    <div>
      <PageHeader title="Verification & management" />
      <div className="mb-5 flex flex-wrap gap-2">{TABS.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setFilter(''); }} className={tab === k ? 'btn-primary' : 'btn-outline'}>{l}</button>)}</div>
      {tab === 'ngos' && <select className="input mb-4 w-48" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All NGOs</option>{['PENDING', 'REVIEW_REQUIRED', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((s) => <option key={s}>{s}</option>)}</select>}
      {tab === 'users' && <input className="input mb-4 max-w-xs" placeholder="Search name or email" onKeyDown={(e) => e.key === 'Enter' && setFilter(e.target.value)} />}
      {!data ? <Spinner /> : !data.length ? <Empty title="Nothing to show" /> : (
        <>
          {tab === 'ngos' && <div className="grid gap-4 md:grid-cols-2">{data.map((n) => (
            <Card key={n._id}>
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{n.organizationName}</p><p className="text-sm text-ink-faint">Reg. {n.registrationNumber} · {n.user?.email}</p></div><StatusBadge status={n.verificationStatus} /></div>
              <p className="mt-2 text-sm">Contact: {n.contactPerson} · {n.phone}</p>
              <p className="text-sm">Areas: {n.operatingAreas?.join(', ') || '—'}</p>
              <ul className="mt-2 text-xs">{n.documents?.length ? n.documents.map((d) => <li key={d.url}><a className="text-sky-600 hover:underline" href={d.url} target="_blank" rel="noreferrer">{d.name}</a></li>) : <li className="text-amber-700">No documents uploaded</li>}</ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn bg-emerald-500 px-3 py-1.5 text-xs text-white hover:bg-emerald-600" onClick={() => ngoAct(n._id, 'APPROVE')}>Approve</button>
                <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => ngoAct(n._id, 'REQUEST_REVIEW')}>Request review</button>
                <button className="btn-outline px-3 py-1.5 text-xs text-rose-600" onClick={() => ngoAct(n._id, 'REJECT')}>Reject</button>
                <button className="btn-ghost px-3 py-1.5 text-xs text-rose-600" onClick={() => ngoAct(n._id, 'SUSPEND')}>Suspend</button>
              </div>
            </Card>))}</div>}
          {tab === 'review' && <div className="grid gap-4 md:grid-cols-2">{data.map((d) => (
            <Card key={d._id} className="space-y-3">
              <div className="flex justify-between gap-2"><div><p className="font-semibold">{d.foodName}</p><p className="text-sm text-ink-faint">{d.quantity} {d.unit} · {d.donor?.name} {d.donor?.riskFlags?.length ? `· flags: ${d.donor.riskFlags.join(', ')}` : ''}</p></div><Countdown until={d.usableUntil} compact /></div>
              {d.images?.[0] && <img src={d.images[0].url} alt="" className="h-40 w-full rounded-xl object-cover" />}
              {d.manualReview?.notes && <p className="text-xs text-amber-700">{d.manualReview.notes}</p>}
              <AiResult ai={d.ai} usableUntil={d.usableUntil} />
              <div className="flex gap-2"><button className="btn bg-emerald-500 flex-1 text-white hover:bg-emerald-600" onClick={() => act(() => api.patch(`/donations/${d._id}/review`, { decision: 'APPROVED' }), 'Donation approved')}>Approve for matching</button>
                <button className="btn-outline flex-1 text-rose-600" onClick={() => { const notes = prompt('Reason for rejection'); if (notes !== null) act(() => api.patch(`/donations/${d._id}/review`, { decision: 'REJECTED', notes }), 'Donation rejected'); }}>Reject</button></div>
            </Card>))}</div>}
          {tab === 'users' && <Card className="overflow-x-auto p-0"><table className="w-full min-w-[760px] text-sm"><thead className="bg-sky-50 text-left text-xs text-ink-faint"><tr><th className="p-3">Name</th><th>Role</th><th>Account</th><th>Verification</th><th>Risk</th><th>Actions</th></tr></thead>
            <tbody>{data.map((u) => <tr key={u._id} className="border-t border-sky-50"><td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-ink-faint">{u.email}</p></td><td>{u.role}</td><td><StatusBadge status={u.accountStatus} /></td><td><StatusBadge status={u.verificationStatus} /></td><td className="text-xs">{u.riskFlags?.join(', ') || '—'}</td>
              <td className="space-x-1 whitespace-nowrap">
                {u.verificationStatus !== 'VERIFIED' && <button className="btn-outline px-2 py-1 text-xs" onClick={() => act(() => api.patch(`/users/${u._id}/status`, { verificationStatus: 'VERIFIED', accountStatus: 'ACTIVE' }), 'User verified')}>Verify</button>}
                {u.accountStatus !== 'SUSPENDED' ? <button className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => act(() => api.patch(`/users/${u._id}/status`, { accountStatus: 'SUSPENDED' }), 'User suspended')}>Suspend</button>
                  : <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act(() => api.patch(`/users/${u._id}/status`, { accountStatus: 'ACTIVE' }), 'User reactivated')}>Reactivate</button>}
                {u.accountStatus !== 'BLOCKED' && u.role !== 'ADMIN' && <button className="btn-ghost px-2 py-1 text-xs text-rose-700" onClick={() => confirm(`Block ${u.name}?`) && act(() => api.patch(`/users/${u._id}/status`, { accountStatus: 'BLOCKED' }), 'User blocked')}>Block</button>}
              </td></tr>)}</tbody></table></Card>}
          {tab === 'audit' && <Card><ul className="divide-y divide-sky-50 text-sm">{data.map((a) => <li key={a._id} className="py-2"><span className="font-medium">{a.actor?.name || 'system'}</span> · {a.action.replace(/_/g, ' ')} · {a.entity} <span className="text-xs text-ink-faint">{new Date(a.createdAt).toLocaleString()}</span></li>)}</ul></Card>}
        </>
      )}
    </div>
  );
}

const COLORS = ['#0E98E6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E', '#22D3EE', '#64748B'];
export function Analytics() {
  const [a, setA] = useState(null);
  const [days, setDays] = useState(14);
  useEffect(() => { api.get(`/analytics/admin?days=${days}`).then((r) => setA(r.data)); }, [days]);
  const exportCsv = async () => {
    const r = await api.get('/analytics/admin/export.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(r.data); const link = document.createElement('a'); link.href = url; link.download = 'donations.csv'; link.click(); URL.revokeObjectURL(url);
  };
  if (!a) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics & reports" actions={<><select className="input w-32" value={days} onChange={(e) => setDays(+e.target.value)}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select>
        <button className="btn-outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button></>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-semibold">Donations per day</h2><ResponsiveContainer width="100%" height={260}><LineChart data={a.daily}><CartesianGrid stroke="#E0F1FE" /><XAxis dataKey="_id" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} /><Tooltip /><Legend />
          <Line dataKey="donations" stroke="#0E98E6" strokeWidth={2} name="Listed" /><Line dataKey="completed" stroke="#10B981" strokeWidth={2} name="Delivered" /><Line dataKey="expired" stroke="#F43F5E" strokeWidth={2} name="Expired" /></LineChart></ResponsiveContainer></Card>
        <Card><h2 className="mb-3 font-semibold">Status breakdown</h2><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={a.byStatus} dataKey="n" nameKey="_id" innerRadius={60} outerRadius={95} paddingAngle={2}>{a.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Card>
        <Card><h2 className="mb-3 font-semibold">Quantity by category</h2><ResponsiveContainer width="100%" height={240}><BarChart data={a.byCategory}><XAxis dataKey="_id" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip /><Bar dataKey="qty" fill="#0E98E6" radius={[6, 6, 0, 0]} name="Quantity" /></BarChart></ResponsiveContainer></Card>
        <Card><h2 className="mb-3 font-semibold">Quantum runs</h2><p className="mb-2 text-xs text-ink-faint">Execution time and matches per run (most recent first).</p><ResponsiveContainer width="100%" height={240}><BarChart data={[...a.runs].reverse()}><XAxis dataKey="at" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} width={30} /><Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} /><Legend />
          <Bar dataKey="seconds" fill="#8B5CF6" name="Seconds" radius={[4, 4, 0, 0]} /><Bar dataKey="matches" fill="#22D3EE" name="Matches" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
        <Card><h2 className="mb-3 font-semibold">AI screening outcomes</h2><ResponsiveContainer width="100%" height={220}><BarChart data={a.aiDist.map((x) => ({ ...x, _id: x._id || 'none' }))} layout="vertical"><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="_id" width={120} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="#8B5CF6" radius={[0, 6, 6, 0]} name="Donations" /></BarChart></ResponsiveContainer></Card>
        <Card><h2 className="mb-3 font-semibold">Users by role</h2><ul className="space-y-2">{a.users.map((u) => <li key={u._id} className="flex justify-between text-sm"><span>{u._id}</span><span className="font-semibold">{u.n}</span></li>)}</ul>
          <p className="mt-4 text-sm">Rescue rate: <b>{a.rescueRate ?? '—'}{a.rescueRate != null && '%'}</b> <span className="text-xs text-ink-faint">(delivered ÷ delivered + expired)</span></p></Card>
      </div>
    </div>
  );
}
