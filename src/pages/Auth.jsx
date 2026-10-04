import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Store, HeartHandshake, User, Bike, LocateFixed, Soup, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, errMsg } from '../lib/api';
import FlowGraphic from '../components/FlowGraphic';
import FoodParticles from '../components/FoodParticles';
import { Field, Spinner } from '../components/ui';

const ROLES = [['DONOR', 'Food donor', Store], ['NGO', 'NGO', HeartHandshake], ['BENEFICIARY', 'Individual in need', User], ['DELIVERY', 'Delivery partner', Bike]];

const loginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password'), remember: z.boolean().optional() });
const regSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^\+?[0-9]{10,14}$/, '10–14 digits, optional +'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[a-z]/, 'Add a lowercase letter').regex(/[0-9]/, 'Add a number'),
  confirmPassword: z.string(),
  address: z.string().min(3, 'Enter your address'),
  city: z.string().min(2, 'Enter your city'),
  role: z.enum(['DONOR', 'NGO', 'BENEFICIARY', 'DELIVERY'], { errorMap: () => ({ message: 'Choose a role' }) }),
  organizationName: z.string().optional(), registrationNumber: z.string().optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to continue' }) }),
}).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.role !== 'NGO' || (v.organizationName && v.registrationNumber), { path: ['registrationNumber'], message: 'NGOs need an organisation name and registration number' });

function strength(pw = '') {
  let s = 0;
  if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return [['Too short', 'bg-rose-400'], ['Weak', 'bg-rose-400'], ['Fair', 'bg-amber-400'], ['Good', 'bg-sky-400'], ['Strong', 'bg-emerald-500'], ['Very strong', 'bg-emerald-600']][s].concat(s);
}

function LoginForm({ onSwitch }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [forgot, setForgot] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { remember: true } });
  const submit = async (v) => { setErr(''); try { await login(v.email, v.password, v.remember); nav('/app'); } catch (e) { setErr(errMsg(e)); } };

  if (forgot) return <ForgotPassword initial={forgot} onDone={() => setForgot(null)} />;
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div><h1 className="text-2xl font-semibold">Welcome back</h1><p className="mt-1 text-sm text-ink-faint">Sign in to keep food moving.</p></div>
      {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{err}</p>}
      <Field label="Email" error={errors.email?.message}><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-ink-faint" /><input className="input pl-9" type="email" autoComplete="email" {...register('email')} /></div></Field>
      <Field label="Password" error={errors.password?.message}>
        <div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-ink-faint" />
          <input className="input pl-9 pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" {...register('password')} />
          <button type="button" className="absolute right-3 top-2.5 text-ink-faint" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
      </Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-sky-500" {...register('remember')} />Remember me</label>
        <button type="button" className="text-sky-600 hover:underline" onClick={() => setForgot({})}>Forgot password?</button>
      </div>
      <button className="btn-primary w-full py-3" disabled={isSubmitting}>{isSubmitting ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Sign in'}</button>
      <p className="text-center text-sm text-ink-faint">Don't have an account? <button type="button" onClick={onSwitch} className="font-medium text-sky-600 hover:underline">Create account</button></p>
    </form>
  );
}

function ForgotPassword({ onDone }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => { setBusy(true); try { const { data } = await api.post('/auth/password/forgot', { email }); setMsg(data.devOtp ? `${data.message} Development code: ${data.devOtp}` : data.message); setStep(2); } catch (e) { setMsg(errMsg(e)); } setBusy(false); };
  const reset = async () => { setBusy(true); try { const { data } = await api.post('/auth/password/reset', { email, code, password: pw }); setMsg(data.message); setStep(3); } catch (e) { setMsg(errMsg(e)); } setBusy(false); };
  return (
    <div className="space-y-4">
      <button className="btn-ghost -ml-3 px-3" onClick={onDone}><ArrowLeft className="h-4 w-4" />Back to sign in</button>
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {msg && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm">{msg}</p>}
      {step === 1 && <><Field label="Account email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field><button className="btn-primary w-full" disabled={busy || !email} onClick={send}>Send reset code</button></>}
      {step === 2 && <><Field label="6-digit code"><input className="input tracking-[.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="New password" hint="8+ characters with upper, lower case and a number"><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <button className="btn-primary w-full" disabled={busy || code.length !== 6} onClick={reset}>Update password</button></>}
      {step === 3 && <button className="btn-primary w-full" onClick={onDone}>Sign in</button>}
    </div>
  );
}

function RegisterForm({ onSwitch }) {
  const { register: signup } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [coords, setCoords] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(regSchema), defaultValues: { role: undefined, acceptTerms: false } });
  const pw = watch('password'); const role = watch('role');
  const [label, color, score] = useMemo(() => strength(pw), [pw]);

  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setErr('Location permission denied. You can set it later in your profile.'));
  const submit = async (v) => {
    setErr('');
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => val !== undefined && fd.append(k, String(val)));
    if (coords) { fd.append('lat', coords.lat); fd.append('lng', coords.lng); }
    if (avatar) fd.append('avatar', avatar);
    try { const data = await signup(fd); if (data.devOtp) setDevOtp(data.devOtp); else nav('/app/profile?verify=1'); } catch (e) { setErr(errMsg(e)); }
  };
  if (devOtp) return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Account created</h1>
      <p className="text-sm text-ink-soft">We sent a verification code to your phone. SMS isn't configured in development, so here it is:</p>
      <p className="text-3xl font-semibold tracking-[.4em] text-sky-600">{devOtp}</p>
      <button className="btn-primary w-full" onClick={() => nav('/app/profile?verify=1')}>Verify my phone</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div><h1 className="text-2xl font-semibold">Create your account</h1><p className="mt-1 text-sm text-ink-faint">Choose how you'll take part.</p></div>
      {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{err}</p>}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
        {ROLES.map(([v, l, Icon]) => (
          <button type="button" key={v} role="radio" aria-checked={role === v} onClick={() => setValue('role', v, { shouldValidate: true })}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${role === v ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200' : 'border-sky-100 hover:border-sky-200'}`}>
            <Icon className={`h-4 w-4 ${role === v ? 'text-sky-600' : 'text-ink-faint'}`} />{l}
          </button>
        ))}
      </div>
      {errors.role && <p className="-mt-2 text-xs text-rose-600">{errors.role.message}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" error={errors.name?.message}><input className="input" autoComplete="name" {...register('name')} /></Field>
        <Field label="Phone" error={errors.phone?.message}><input className="input" type="tel" autoComplete="tel" {...register('phone')} /></Field>
      </div>
      <Field label="Email" error={errors.email?.message}><input className="input" type="email" autoComplete="email" {...register('email')} /></Field>
      {role === 'NGO' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Organisation name"><input className="input" {...register('organizationName')} /></Field>
          <Field label="Registration number" error={errors.registrationNumber?.message}><input className="input" {...register('registrationNumber')} /></Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Password" error={errors.password?.message}>
          <input className="input" type="password" autoComplete="new-password" {...register('password')} />
          {pw && <div className="mt-2"><div className="flex gap-1">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= score ? color : 'bg-sky-100'}`} />)}</div><p className="mt-1 text-xs text-ink-faint">{label}</p></div>}
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}><input className="input" type="password" autoComplete="new-password" {...register('confirmPassword')} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Address" error={errors.address?.message}><input className="input" autoComplete="street-address" {...register('address')} /></Field>
        <Field label="City" error={errors.city?.message}><input className="input" autoComplete="address-level2" {...register('city')} /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-outline" onClick={locate}><LocateFixed className="h-4 w-4" />{coords ? 'Location saved' : 'Use my location'}</button>
        <label className="btn-outline cursor-pointer">
          {avatar ? <img src={URL.createObjectURL(avatar)} alt="" className="h-5 w-5 rounded-full object-cover" /> : <User className="h-4 w-4" />}Profile photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => setAvatar(e.target.files[0])} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-sky-500" {...register('acceptTerms')} />
        <span>I agree to the terms and understand that AI screening does not certify food safety.</span></label>
      {errors.acceptTerms && <p className="-mt-2 text-xs text-rose-600">{errors.acceptTerms.message}</p>}
      <button className="btn-primary w-full py-3" disabled={isSubmitting}>{isSubmitting ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Create account'}</button>
      <p className="text-center text-sm text-ink-faint">Already registered? <button type="button" onClick={onSwitch} className="font-medium text-sky-600 hover:underline">Sign in</button></p>
    </form>
  );
}

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const flip = () => setParams(mode === 'login' ? { mode: 'register' } : {});
  const isReg = mode === 'register';

  return (
    <div className="relative grid min-h-screen place-items-center bg-sky-wash px-4 py-10">
      <FoodParticles />
      <Link to="/" className="absolute left-5 top-5 flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 text-white"><Soup className="h-4 w-4" /></span>FoodBridge</Link>
      <div className="w-full max-w-5xl" style={{ perspective: 1800 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode}
            initial={{ rotateY: isReg ? -90 : 90, opacity: 0.4 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: isReg ? 90 : -90, opacity: 0.4 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }} style={{ transformStyle: 'preserve-3d' }}
            className={`glass flex flex-col overflow-hidden rounded-[2rem] md:flex-row ${isReg ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1 bg-white/90 p-7 sm:p-10">{isReg ? <RegisterForm onSwitch={flip} /> : <LoginForm onSwitch={flip} />}</div>
            <div className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-deep via-sky-800 to-violet-900 p-10 md:flex">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-violet-500/30 blur-3xl" />
              <p className="relative mb-6 text-xl font-semibold text-white">{isReg ? 'Every role moves food one step closer to someone who needs it.' : 'Surplus in, meals out.'}</p>
              <div className="relative"><FlowGraphic dark /></div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
