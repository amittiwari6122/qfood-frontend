import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Clock, Inbox } from 'lucide-react';
import { fmtMinutes } from '../lib/api';

export const Card = ({ className = '', children, ...p }) => <div className={`card p-5 ${className}`} {...p}>{children}</div>;

const TONE = {
  sky: 'bg-sky-100 text-sky-700', green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-800',
  red: 'bg-rose-100 text-rose-700', violet: 'bg-violet-100 text-violet-700', gray: 'bg-slate-100 text-slate-600', cyan: 'bg-cyan-100 text-cyan-800',
};
export const Badge = ({ tone = 'sky', children, dot }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}
  </span>
);

const STATUS_TONE = {
  AVAILABLE: 'sky', PENDING_REVIEW: 'amber', MATCHED: 'violet', ACCEPTED: 'cyan', PICKED_UP: 'cyan', IN_TRANSIT: 'cyan', DELIVERED: 'green', COMPLETED: 'green',
  EXPIRED: 'red', CANCELLED: 'gray', REJECTED: 'red', SAFE: 'green', CAUTION: 'amber', UNSAFE: 'red', MANUAL_REVIEW: 'amber', NOT_ANALYZED: 'gray',
  OPEN: 'sky', PARTIALLY_FULFILLED: 'cyan', FULFILLED: 'green', AWAITING_PARTNER: 'amber', ASSIGNED: 'sky', FAILED: 'red', PROPOSED: 'violet',
  VERIFIED: 'green', PENDING: 'amber', REVIEW_REQUIRED: 'amber', SUSPENDED: 'red', BLOCKED: 'red', ACTIVE: 'green', success: 'green', no_feasible: 'amber', RUNNING: 'violet',
  HIGH: 'amber', CRITICAL: 'red', NORMAL: 'gray',
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'gray'} dot>{String(status || '').replace(/_/g, ' ').toLowerCase()}</Badge>;

export function Countdown({ until, compact }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const m = (new Date(until) - now) / 60000;
  const tone = m <= 0 ? 'text-rose-600 bg-rose-50' : m < 60 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${tone}`}>
      <Clock className={`h-3.5 w-3.5 ${m > 0 && m < 60 ? 'animate-pulse' : ''}`} />
      {compact ? fmtMinutes(m) : m <= 0 ? 'Expired' : `Usable for ${fmtMinutes(m)}`}
    </span>
  );
}

export function CountUp({ value = 0, suffix = '' }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => { const c = animate(mv, value, { duration: 1.2, ease: 'easeOut' }); return c.stop; }, [value, mv]);
  return <><motion.span>{rounded}</motion.span>{suffix}</>;
}

export const Stat = ({ icon: Icon, label, value, suffix, tone = 'sky' }) => {
  const tones = { sky: 'from-sky-400 to-sky-600', green: 'from-emerald-400 to-emerald-600', amber: 'from-amber-400 to-orange-500', violet: 'from-violet-500 to-cyan-400', red: 'from-rose-400 to-rose-600' };
  return (
    <Card className="flex items-center gap-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-soft`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-2xl font-semibold leading-tight"><CountUp value={value ?? 0} suffix={suffix} /></p><p className="text-xs text-ink-faint">{label}</p></div>
    </Card>
  );
};

export const Empty = ({ title, children, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-white/60 px-6 py-12 text-center">
    <Inbox className="mb-3 h-8 w-8 text-sky-300" /><p className="font-medium">{title}</p>
    {children && <p className="mt-1 max-w-sm text-sm text-ink-faint">{children}</p>}{action && <div className="mt-4">{action}</div>}
  </div>
);

export const PageHeader = ({ title, sub, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold">{title}</h1>{sub && <p className="mt-1 text-sm text-ink-faint">{sub}</p>}</div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export const Field = ({ label, error, children, hint }) => (
  <label className="block">
    {label && <span className="label">{label}</span>}{children}
    {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
  </label>
);

export const Spinner = ({ className = 'h-5 w-5' }) => <span className={`inline-block animate-spin rounded-full border-2 border-sky-200 border-t-sky-500 ${className}`} />;
