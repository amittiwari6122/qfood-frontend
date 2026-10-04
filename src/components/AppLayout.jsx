import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PackagePlus, Package, ClipboardList, Atom, Truck, MessageCircle, Bell, Star, BarChart3, ShieldCheck, ShoppingBag, UserRound, LogOut, Menu, X, Soup, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import i18n from '../i18n';

const NAV = {
  DONOR: [['', 'overview', LayoutDashboard], ['donate', 'donate', PackagePlus], ['donations', 'myDonations', Package], ['quantum', 'quantum', Atom], ['deliveries', 'deliveries', Truck], ['chat', 'chat', MessageCircle], ['feedback', 'feedback', Star]],
  NGO: [['', 'overview', LayoutDashboard], ['requests', 'requests', ClipboardList], ['available', 'available', Soup], ['matches', 'matches', Sparkles], ['quantum', 'quantum', Atom], ['deliveries', 'deliveries', Truck], ['chat', 'chat', MessageCircle], ['market', 'market', ShoppingBag], ['feedback', 'feedback', Star]],
  BENEFICIARY: [['', 'overview', LayoutDashboard], ['requests', 'requests', ClipboardList], ['available', 'available', Soup], ['matches', 'matches', Sparkles], ['market', 'market', ShoppingBag], ['deliveries', 'deliveries', Truck], ['chat', 'chat', MessageCircle], ['feedback', 'feedback', Star]],
  DELIVERY: [['', 'overview', LayoutDashboard], ['deliveries', 'deliveries', Truck], ['chat', 'chat', MessageCircle], ['feedback', 'feedback', Star]],
  ADMIN: [['', 'overview', LayoutDashboard], ['admin', 'admin', ShieldCheck], ['quantum', 'quantum', Atom], ['analytics', 'analytics', BarChart3], ['deliveries', 'deliveries', Truck]],
};
const ROLE_LABEL = { DONOR: 'Food donor', NGO: 'NGO', BENEFICIARY: 'Beneficiary', DELIVERY: 'Delivery partner', ADMIN: 'Admin' };

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { notifications, ring } = useRealtime();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const items = [...NAV[user.role], ['notifications', 'notifications', Bell], ['profile', 'profile', UserRound]];

  const Side = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white"><Soup className="h-5 w-5" /></span>
        <div><p className="font-semibold leading-none">FoodBridge</p><p className="text-[11px] text-ink-faint">{ROLE_LABEL[user.role]}</p></div>
      </div>
      {items.map(([to, key, Icon]) => (
        <NavLink key={key} to={`/app/${to}`} end={to === ''} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-sky-500 text-white shadow-soft' : 'text-ink-soft hover:bg-sky-100'}`}>
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />{t(key)}
          {key === 'notifications' && unread > 0 && <span className="ml-auto rounded-full bg-orange-400 px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
        </NavLink>
      ))}
      <button onClick={() => { logout(); nav('/'); }} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-rose-50 hover:text-rose-600">
        <LogOut className="h-[18px] w-[18px]" />{t('logout')}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-sky-wash">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sky-100 bg-white/80 backdrop-blur-xl lg:block">{Side}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-deep/30" onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-64 bg-white" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}>{Side}</motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-sky-100 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button className="btn-ghost p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <p className="text-sm text-ink-faint">Hello, <span className="font-medium text-ink">{user.name.split(' ')[0]}</span></p>
          {user.verificationStatus !== 'VERIFIED' && user.role !== 'ADMIN' && (
            <NavLink to="/app/profile" className="hidden sm:inline-flex"><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Verification {user.verificationStatus.toLowerCase().replace('_', ' ')}</span></NavLink>
          )}
          <div className="ml-auto flex items-center gap-2">
            <select aria-label="Language" className="rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs" value={i18n.language}
              onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('lang', e.target.value); }}>
              <option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option>
            </select>
            <NavLink to="/app/notifications" className="relative btn-ghost p-2" aria-label={`${unread} unread notifications`}>
              <motion.span key={ring} animate={ring ? { rotate: [0, 16, -14, 8, 0] } : {}} transition={{ duration: 0.8 }} className="block origin-top"><Bell className="h-5 w-5" /></motion.span>
              {unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-orange-400 ring-2 ring-white" />}
            </NavLink>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">{user.name[0]}</span>}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet /></main>
      </div>
    </div>
  );
}
