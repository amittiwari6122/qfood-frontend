import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { Atom, Play, CheckCircle2, XCircle, Cpu, Cloud, Sigma, Binary, ShieldCheck, MapPin, Gauge, Clock } from 'lucide-react';
import { api, errMsg, fmtMinutes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Card, PageHeader, Spinner, StatusBadge, Empty } from '../components/ui';

const STAGES = [['building_qubo', 'Building QUBO'], ['running_qaoa', 'Running QAOA'], ['validating', 'Validating solution'], ['done', 'Done']];

/** Donor nodes → quantum core → NGO nodes. Lines light up for each validated assignment. */
function QuantumField({ run, active }) {
  const reduce = useReducedMotion();
  const W = 900, H = 380, CX = W / 2, CY = H / 2;
  const { donors, ngos, links } = useMemo(() => {
    const a = run?.assignments || [];
    const dIds = [...new Set([...a.map((x) => x.donationId), ...(run?.pruned || []).map((p) => p.donationId)])].slice(0, 8);
    // NGO nodes: matched NGOs first; if nothing matched, show the requests that were considered.
    const matchedNgos = [...new Set(a.map((x) => x.ngoId))];
    const nIds = (matchedNgos.length ? matchedNgos : [...new Set((run?.pruned || []).map((p) => p.requestId))]).slice(0, 8);
    const place = (ids, x) => ids.map((id, i) => ({ id, x, y: ids.length === 1 ? CY : 50 + (i * (H - 100)) / (ids.length - 1) }));
    const D = place(dIds.length ? dIds : ['a', 'b', 'c', 'd'], 90), N = place(nIds.length ? nIds : ['e', 'f', 'g'], W - 90);
    const ngoById = new Map(N.map((n) => [n.id, n]));
    const L = a.map((x, i) => ({ from: D.find((d) => d.id === x.donationId), to: ngoById.get(x.ngoId) || N[i % N.length], a: x })).filter((l) => l.from);
    return { donors: D, ngos: N, links: L };
  }, [run]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-quantum-night">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,.25),transparent_60%)]" />
      <svg viewBox={`0 0 ${W} ${H}`} className="relative w-full" role="img" aria-label="Quantum matching visualisation">
        <defs>
          <radialGradient id="core"><stop offset="0%" stopColor="#E0E7FF" /><stop offset="35%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#22D3EE" stopOpacity="0" /></radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[...donors, ...ngos].map((n) => <line key={`l${n.id}`} x1={n.x} y1={n.y} x2={CX} y2={CY} stroke="#334155" strokeWidth="1" strokeDasharray="3 6" />)}
        {active && !reduce && donors.map((d, i) => (
          <motion.circle key={`p${d.id}`} r="3" fill="#22D3EE" filter="url(#glow)"
            animate={{ cx: [d.x, CX], cy: [d.y, CY], opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
        ))}
        {!active && links.map((l, i) => (
          <motion.path key={`m${i}`} d={`M${l.from.x},${l.from.y} Q${CX},${CY} ${l.to.x},${l.to.y}`} fill="none" stroke="#22D3EE" strokeWidth="2.5" filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.1, delay: 0.3 + i * 0.25 }} />
        ))}
        <motion.circle cx={CX} cy={CY} r="70" fill="url(#core)" animate={active && !reduce ? { r: [62, 78, 62] } : { r: 66 }} transition={{ duration: 1.6, repeat: Infinity }} />
        <motion.g animate={active && !reduce ? { rotate: 360 } : {}} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} style={{ originX: `${CX}px`, originY: `${CY}px` }}>
          {[0, 60, 120].map((r) => <ellipse key={r} cx={CX} cy={CY} rx="46" ry="16" fill="none" stroke="#C4B5FD" strokeOpacity=".7" transform={`rotate(${r} ${CX} ${CY})`} />)}
        </motion.g>
        <text x={CX} y={CY + 105} textAnchor="middle" fill="#C4B5FD" fontSize="13">{active ? 'QAOA optimisation running' : 'Quantum processing core'}</text>
        {donors.map((d, i) => <g key={d.id}><circle cx={d.x} cy={d.y} r="13" fill="#0E98E6" stroke="#BAE3FD" strokeWidth="2" /><text x={d.x - 24} y={d.y + 4} textAnchor="end" fill="#BAE3FD" fontSize="11">D{i + 1}</text></g>)}
        {ngos.map((n, i) => <g key={n.id}><circle cx={n.x} cy={n.y} r="13" fill="#10B981" stroke="#A7F3D0" strokeWidth="2" /><text x={n.x + 24} y={n.y + 4} fill="#A7F3D0" fontSize="11">N{i + 1}</text></g>)}
        <text x="90" y="24" textAnchor="middle" fill="#7DCDFB" fontSize="12">Donations</text>
        <text x={W - 90} y="24" textAnchor="middle" fill="#6EE7B7" fontSize="12">NGO requests</text>
      </svg>
    </div>
  );
}

function QuboMatrix({ qubo }) {
  const [hover, setHover] = useState(null);
  if (!qubo?.dense) return <p className="text-sm text-ink-faint">Matrix too large to display ({qubo?.size} variables). {qubo?.entries?.length} non-zero terms.</p>;
  const n = qubo.size;
  const max = Math.max(...qubo.dense.flat().map(Math.abs), 1);
  const cell = Math.max(12, Math.min(34, Math.floor(560 / n)));
  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${n}, ${cell}px)` }}>
          {qubo.dense.flatMap((row, i) => row.map((v, j) => {
            const a = Math.abs(v) / max;
            const bg = v === 0 ? '#F1F5F9' : v < 0 ? `rgba(34,211,238,${0.2 + a * 0.8})` : `rgba(139,92,246,${0.2 + a * 0.8})`;
            return <motion.span key={`${i}-${j}`} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (i + j) * 0.012 }}
              onMouseEnter={() => setHover({ i, j, v })} style={{ width: cell, height: cell, background: bg }} className="rounded-[3px]" />;
          }))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-cyan-400" />Negative (reward)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-violet-500" />Positive (penalty / cost)</span>
        {hover && <span className="font-mono text-ink">Q[{hover.i},{hover.j}] = {hover.v} · {qubo.labels[hover.i]}{hover.i !== hover.j ? ` × ${qubo.labels[hover.j]}` : ''}</span>}
      </div>
    </div>
  );
}

export default function QuantumEngine() {
  const { user } = useAuth();
  const { socket, toast } = useRealtime();
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [health, setHealth] = useState(null);
  const [problem, setProblem] = useState(null);
  const [stage, setStage] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [l, h, p, rs] = await Promise.allSettled([api.get('/quantum/runs/latest'), api.get('/quantum/health'), api.get('/quantum/problem'), api.get('/quantum/runs')]);
    if (l.status === 'fulfilled') setRun(l.value.data);
    if (h.status === 'fulfilled') { setHealth(h.value.data); if (h.value.data.running) setStage('running_qaoa'); }
    if (p.status === 'fulfilled') setProblem(p.value.data);
    if (rs.status === 'fulfilled') setRuns(rs.value.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!socket) return undefined;
    const on = (e) => { setStage(e.stage); if (e.stage === 'done') { setTimeout(() => setStage(null), 600); load(); } };
    socket.on('quantum:status', on);
    return () => socket.off('quantum:status', on);
  }, [socket, load]);

  const start = async () => {
    setStage('building_qubo');
    try { await api.post('/quantum/run'); } catch (e) { toast('Quantum run failed', errMsg(e), 'error'); setStage(null); }
  };

  if (loading) return <Spinner />;
  const active = !!stage && stage !== 'done';
  const viz = run?.visualization;
  const isCloud = run?.executionMode === 'cloud';
  const stat = (Icon, label, value, tone = 'text-ink') => (
    <div className="rounded-xl border border-sky-100 bg-white p-3"><p className="flex items-center gap-1.5 text-xs text-ink-faint"><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-1 text-lg font-semibold ${tone}`}>{value ?? '—'}</p></div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Quantum AI Matching Engine" sub="Donation–NGO matching formulated as a QUBO and solved with QAOA (Qiskit)."
        actions={['ADMIN', 'DONOR', 'NGO', 'BENEFICIARY'].includes(user.role) && <button className="btn-quantum" onClick={start} disabled={active}><Play className="h-4 w-4" />Run matching now</button>} />


      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stat(Atom, 'Algorithm', 'QAOA', 'text-violet-600')}
        {stat(isCloud ? Cloud : Cpu, 'Execution', isCloud ? 'Quantum cloud' : 'Quantum simulator')}
        {stat(Cpu, 'Backend', run?.backend || health?.backend)}
        {stat(Binary, 'Donations in pool', problem?.donations)}
        {stat(Binary, 'Open requests', problem?.requests)}
        {stat(Sigma, 'Possible pairings', problem?.possibleAssignments)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <QuantumField run={run} active={active} />
          <div className="mt-3 flex flex-wrap gap-2">
            {STAGES.map(([k, l], i) => {
              const idx = STAGES.findIndex(([s]) => s === stage);
              const state = !stage ? 'idle' : i < idx ? 'done' : i === idx ? 'now' : 'todo';
              return <span key={k} className={`rounded-full px-3 py-1 text-xs font-medium ${state === 'now' ? 'bg-violet-500 text-white animate-pulse' : state === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{l}</span>;
            })}
          </div>
        </div>
        <Card className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{active ? 'Quantum optimisation active' : 'Last run'}</h2>{run && <StatusBadge status={active ? 'RUNNING' : run.status} />}</div>
          {!run ? <p className="text-sm text-ink-faint">No runs yet. Runs start automatically when donations or requests change.</p> : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-ink-faint">QUBO variables</dt><dd className="font-semibold">{run.numberOfVariables}</dd></div>
              <div><dt className="text-ink-faint">Constraints</dt><dd className="font-semibold">{run.numberOfConstraints}</dd></div>
              <div><dt className="text-ink-faint">Best objective</dt><dd className="font-semibold">{run.objectiveValue ?? '—'}</dd></div>
              <div><dt className="text-ink-faint">Valid assignments</dt><dd className="font-semibold">{run.assignments?.length || 0}</dd></div>
              <div><dt className="text-ink-faint">Execution time</dt><dd className="font-semibold">{run.executionTime}s</dd></div>
              <div><dt className="text-ink-faint">Pairs pruned</dt><dd className="font-semibold">{run.pruned?.length || 0}</dd></div>
              <div className="col-span-2"><dt className="text-ink-faint">Trigger</dt><dd>{run.trigger}</dd></div>
              {run.decomposition && <div className="col-span-2"><dt className="text-ink-faint">Decomposition</dt><dd>{run.decomposition.note} (≤{run.decomposition.maxQubitsPerBatch} qubits each)</dd></div>}
              {run.message && <div className="col-span-2 rounded-lg bg-amber-50 p-2 text-amber-800">{run.message}</div>}
            </dl>
          )}
        </Card>
      </div>

      {run?.assignments?.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {run.assignments.map((a, i) => (
              <motion.div key={a.donationId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.12 }} className="card anim-border p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-violet-600"><CheckCircle2 className="h-3.5 w-3.5" />Quantum match found</p>
                <p className="mt-1.5 font-semibold">{a.quantity} {a.unit || 'meals'} · {a.foodName || 'Donation'}</p>
                <p className="text-sm text-ink-faint">→ {a.ngoName || 'NGO'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-sky-500" />{a.distanceKm?.toFixed(1)} km</span>
                  <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5 text-violet-500" />{Math.round(a.foodQuality * 100)}% quality</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" />{fmtMinutes(a.remainingMinutes)} left</span>
                  <span className="flex items-center gap-1"><Sigma className="h-3.5 w-3.5 text-cyan-600" />net benefit {a.netBenefit}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {viz && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <h2 className="font-semibold">QAOA convergence</h2>
            <p className="mb-3 text-xs text-ink-faint">Expected energy ⟨H⟩ per classical optimiser evaluation (COBYLA, p = {viz.reps}, {viz.history.length} evaluations). Each spike is a fresh random restart; the best restart's angles are used for sampling.</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={viz.history.map((v, i) => ({ i, v }))}><CartesianGrid stroke="#E0F1FE" /><XAxis dataKey="i" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} /><Tooltip /><Line dataKey="v" stroke="#8B5CF6" dot={false} strokeWidth={2} name="⟨H⟩" /></LineChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h2 className="font-semibold">Measured probability distribution</h2>
            <p className="mb-3 text-xs text-ink-faint">Most frequent bitstrings after sampling. Colour shows QUBO energy — lower is better.</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={viz.distribution}><XAxis dataKey="bits" tick={false} /><YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip formatter={(v, n, p) => [`${(v * 100).toFixed(2)}% · E=${p.payload.energy}`, p.payload.bits]} />
                <Bar dataKey="probability">{viz.distribution.map((d, i) => { const es = viz.distribution.map((x) => x.energy); const t = (d.energy - Math.min(...es)) / (Math.max(...es) - Math.min(...es) || 1); return <Cell key={i} fill={t < 0.2 ? '#22D3EE' : t < 0.6 ? '#8B5CF6' : '#CBD5E1'} />; })}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          {user.role === 'ADMIN' && (
            <>
              <Card className="xl:col-span-2">
                <h2 className="font-semibold">QUBO matrix</h2>
                <p className="mb-4 text-xs text-ink-faint">E(x) = xᵀQx + {viz.qubo.offset?.toFixed?.(2) ?? 0}. Diagonal = per-pairing net benefit; off-diagonal = constraint penalties. Hover a cell to inspect it.</p>
                <QuboMatrix qubo={viz.qubo} />
              </Card>
              <Card>
                <h2 className="mb-3 font-semibold">Objective terms</h2>
                <div className="max-h-72 overflow-auto text-xs">
                  <table className="w-full"><thead className="sticky top-0 bg-white text-left text-ink-faint"><tr><th className="py-1">Variable</th><th>Benefit</th><th>Cost</th><th>Net</th></tr></thead>
                    <tbody>{viz.objectiveTerms.map((t) => <tr key={t.var} className="border-t border-sky-50"><td className="py-1.5 font-mono">x{t.var}</td>
                      <td className="text-emerald-600">{Object.values(t.benefit).reduce((a, b) => a + b, 0).toFixed(2)}</td><td className="text-rose-500">{Object.values(t.cost).reduce((a, b) => a + b, 0).toFixed(2)}</td><td className="font-semibold">{t.net}</td></tr>)}</tbody></table>
                </div>
              </Card>
              <Card>
                <h2 className="mb-3 font-semibold">Penalty terms & solution quality</h2>
                <ul className="space-y-2 text-sm">{viz.penaltyTerms.map((p) => <li key={p.name} className="flex justify-between gap-3"><span>{p.name}</span><span className="text-ink-faint">λ = {p.weight.toFixed(1)}{p.pairs != null ? ` · ${p.pairs} pairs` : ''}</span></li>)}</ul>
                <h3 className="mb-2 mt-5 text-sm font-semibold">Batches</h3>
                <ul className="space-y-2 text-xs">{run.batches.map((b) => (
                  <li key={b.batch} className="rounded-lg bg-sky-50 p-2.5">
                    <p>Batch {b.batch + 1}: {b.qubits} qubits ({b.slackBits} slack), circuit depth {b.circuitDepth}, {b.evaluations} evaluations</p>
                    <p className="mt-1 flex items-center gap-1.5">{b.reachedExactOptimum ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-amber-500" />}
                      Selected E = {b.selectedEnergy ?? '—'} vs exact minimum {b.exactMinEnergy ?? 'n/a'}{b.rejectedSamples ? ` · ${b.rejectedSamples} invalid samples rejected` : ''}</p>
                  </li>))}</ul>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint"><ShieldCheck className="h-3.5 w-3.5" />Every decoded solution is re-validated against expiry, quantity, verification and duplicates before saving.</p>
              </Card>
            </>
          )}
        </div>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Run history</h2>
        {!runs.length ? <Empty title="No runs yet" /> : (
          <div className="overflow-x-auto text-sm"><table className="w-full min-w-[640px]"><thead className="text-left text-xs text-ink-faint"><tr><th className="py-2">When</th><th>Trigger</th><th>Variables</th><th>Matches</th><th>Objective</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>{runs.map((r) => <tr key={r.runId} className="border-t border-sky-50"><td className="py-2">{new Date(r.createdAt).toLocaleString()}</td><td className="max-w-[220px] truncate">{r.trigger}</td><td>{r.numberOfVariables ?? '—'}</td><td>{r.assignments?.length ?? 0}</td><td>{r.objectiveValue ?? '—'}</td><td>{r.executionTime != null ? `${r.executionTime}s` : '—'}</td><td><StatusBadge status={r.status} /></td></tr>)}</tbody></table></div>
        )}
      </Card>
    </div>
  );
}
