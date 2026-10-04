import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ScanEye, Atom, MapPinned, ShieldCheck, Leaf, Soup, ChevronDown, Quote } from 'lucide-react';
import FlowGraphic from '../components/FlowGraphic';
import { CountUp } from '../components/ui';
import { api } from '../lib/api';

const STEPS = [
  ['Donor lists surplus food', 'Restaurants, caterers and households add what they have, with a mandatory usable-until time.'],
  ['AI checks the photo', 'A vision model screens visible condition and flags anything a person should look at.'],
  ['Quantum engine matches', 'Every donation–NGO pairing becomes a binary variable in one QUBO, solved with QAOA.'],
  ['NGO accepts', 'Verified NGOs get the match instantly and accept or decline in one tap.'],
  ['Partner delivers', 'A delivery partner picks up with a one-time code and is tracked live to the door.'],
  ['Everyone closes the loop', 'Recipients confirm with a code and leave feedback that keeps the network honest.'],
];
const FAQ = [
  ['Is the quantum part real?', 'Yes. Matching is formulated as a QUBO and solved with QAOA in Qiskit. Locally it runs on the Qiskit Aer simulator, and the app labels it as a simulator. It can also send the optimised circuit to IBM Quantum hardware when configured.'],
  ['Does the AI certify food as safe?', 'No. The image analysis is decision support. Expiry, storage limits, verification and manual review rules still decide whether food can be matched.'],
  ['Who can receive food?', 'Admin-verified NGOs, and individuals who verify their phone number. Unverified or suspended accounts never receive matched donations.'],
  ['What happens if an NGO declines?', 'The donation goes straight back into the pool and the engine re-runs, excluding that NGO for that donation.'],
];

export default function Landing() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [voices, setVoices] = useState([]);
  const [faq, setFaq] = useState(0);
  useEffect(() => {
    api.get('/analytics/public/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/analytics/public/testimonials').then((r) => setVoices(r.data)).catch(() => {});
  }, []);

  return (
    <div className="bg-sky-wash min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white"><Soup className="h-5 w-5" /></span><span className="font-semibold">FoodBridge</span></div>
        <nav className="flex items-center gap-2"><Link to="/auth" className="btn-ghost">{t('login')}</Link><Link to="/auth?mode=register" className="btn-primary">{t('register')}</Link></nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.25fr_1fr]">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-4xl font-semibold leading-[1.08] text-deep sm:text-6xl">{t('heroTitle')}</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-5 max-w-xl text-lg text-ink-soft">{t('heroSub')}</motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth?mode=register" className="btn-primary px-6 py-3 text-base">{t('getStarted')}</Link>
            <Link to="/auth" className="btn-outline px-6 py-3 text-base">{t('login')}</Link>
          </motion.div>
          <p className="mt-6 text-xs text-ink-faint">Quantum matching runs on a simulator by default and says so in the app.</p>
        </div>
        <div className="glass rounded-[2rem] p-6"><FlowGraphic /></div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-semibold text-deep">How it works</h2>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {STEPS.map(([h, p], i) => (
              <li key={h} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">{i + 1}</span>
                <div><h3 className="font-semibold">{h}</h3><p className="mt-1 text-sm text-ink-soft">{p}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-20 md:grid-cols-2">
        <div className="card overflow-hidden p-7">
          <ScanEye className="h-7 w-7 text-violet-500" />
          <h3 className="mt-4 text-xl font-semibold">AI food quality screening</h3>
          <p className="mt-2 text-sm text-ink-soft">Each photo is checked for visible spoilage, discoloration and packaging damage. Results come back as low-risk, caution, high-risk or needs review — with the indicators that drove the call.</p>
          <div className="relative mt-6 h-28 overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-amber-50">
            <span className="absolute inset-0 grid place-items-center text-5xl">🍛</span>
            <span className="absolute inset-x-0 h-0.5 bg-violet-500 shadow-[0_0_14px_#8B5CF6] animate-scan" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-quantum-night p-7 text-white shadow-lift">
          <Atom className="h-7 w-7 text-quantum-cyan" />
          <h3 className="mt-4 text-xl font-semibold">Quantum matching</h3>
          <p className="mt-2 text-sm text-white/70">Quality, freshness, distance, urgency and quantity fit become one energy landscape. QAOA searches it for the lowest-energy set of assignments, then every match is re-validated before anyone is notified.</p>
          <div className="mt-6 grid grid-cols-8 gap-1">
            {Array.from({ length: 32 }).map((_, i) => (
              <motion.span key={i} className="aspect-square rounded-sm bg-quantum-cyan" animate={{ opacity: [0.1, 0.9, 0.1] }} transition={{ duration: 2.4, repeat: Infinity, delay: ((i * 7) % 32) * 0.08 }} />
            ))}
          </div>
        </div>
        <div className="card p-7"><ShieldCheck className="h-7 w-7 text-emerald-500" /><h3 className="mt-4 text-xl font-semibold">Verified NGOs only</h3><p className="mt-2 text-sm text-ink-soft">Admins check registration documents before an NGO enters matching. Suspended or unverified accounts are pruned from the problem before it reaches the solver.</p></div>
        <div className="card p-7"><MapPinned className="h-7 w-7 text-sky-500" /><h3 className="mt-4 text-xl font-semibold">Live delivery tracking</h3><p className="mt-2 text-sm text-ink-soft">Donor and NGO watch the partner move on the map. Pickup and drop-off each need a one-time code, so food is handed only to the right person.</p></div>
      </section>

      <section className="bg-deep py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-4">
          {[['Meals delivered', stats?.donationsCompleted], ['People served', stats?.peopleServed], ['Food saved', stats?.foodSavedKg, ' kg'], ['Verified NGOs', stats?.verifiedNgos]].map(([l, v, s]) => (
            <div key={l}><p className="text-4xl font-semibold"><CountUp value={v || 0} suffix={s} /></p><p className="mt-1 text-sm text-white/60">{l}</p></div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-6xl px-5 text-xs text-white/40"><Leaf className="mr-1 inline h-3 w-3" />Live figures from this platform. Food saved assumes 0.4 kg per meal.</p>
      </section>

      {voices.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold text-deep">From the people using it</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {voices.map((v) => <figure key={v._id} className="card p-6"><Quote className="h-5 w-5 text-sky-300" /><blockquote className="mt-3 text-sm">{v.comment}</blockquote><figcaption className="mt-4 text-xs text-ink-faint">{v.from?.name}</figcaption></figure>)}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-3xl font-semibold text-deep">Questions</h2>
        <div className="mt-8 divide-y divide-sky-100 rounded-2xl bg-white shadow-soft">
          {FAQ.map(([q, a], i) => (
            <div key={q}>
              <button className="flex w-full items-center justify-between px-6 py-4 text-left font-medium" onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i}>
                {q}<ChevronDown className={`h-4 w-4 transition ${faq === i ? 'rotate-180' : ''}`} />
              </button>
              <motion.div initial={false} animate={{ height: faq === i ? 'auto' : 0 }} className="overflow-hidden"><p className="px-6 pb-5 text-sm text-ink-soft">{a}</p></motion.div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-sky-100 bg-white py-10 text-sm text-ink-faint">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5">
          <p>FoodBridge — Quantum AI Powered Smart Food Waste & Donation Management System</p>
          <div className="flex gap-4"><Link to="/auth">{t('login')}</Link><Link to="/auth?mode=register">{t('register')}</Link></div>
        </div>
      </footer>
    </div>
  );
}
