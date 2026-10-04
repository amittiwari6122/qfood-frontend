import { motion } from 'framer-motion';
import { Store, Soup, ScanEye, Atom, HeartHandshake, Truck, Users } from 'lucide-react';

const STEPS = [
  { icon: Store, label: 'Donor', c: 'bg-sky-500' }, { icon: Soup, label: 'Food', c: 'bg-orange-400' },
  { icon: ScanEye, label: 'AI quality', c: 'bg-violet-500' }, { icon: Atom, label: 'Quantum match', c: 'bg-gradient-to-br from-violet-500 to-cyan-400' },
  { icon: HeartHandshake, label: 'NGO', c: 'bg-emerald-500' }, { icon: Truck, label: 'Delivery', c: 'bg-sky-600' }, { icon: Users, label: 'Beneficiary', c: 'bg-emerald-600' },
];

/** The redistribution chain as a single orchestrated reveal; a parcel travels the line. */
export default function FlowGraphic({ dark = false }) {
  return (
    <div className="relative mx-auto w-full max-w-sm py-2">
      <div className={`absolute left-[27px] top-6 bottom-6 w-0.5 ${dark ? 'bg-white/20' : 'bg-sky-200'}`} />
      <motion.div className="absolute left-[22px] h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_12px_#FB923C]"
        animate={{ top: ['6%', '90%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }} />
      <ul className="relative space-y-3">
        {STEPS.map((s, i) => (
          <motion.li key={s.label} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i, type: 'spring', stiffness: 160 }}
            className="flex items-center gap-4">
            <span className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lift ${s.c}`}>
              <s.icon className="h-6 w-6" />
              {s.label === 'Quantum match' && <span className="absolute inset-0 rounded-2xl ring-2 ring-cyan-300 animate-pulseRing" />}
            </span>
            <span className={`text-sm font-medium ${dark ? 'text-white/90' : 'text-ink'}`}>{s.label}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
