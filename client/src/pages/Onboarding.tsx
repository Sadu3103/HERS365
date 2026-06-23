import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, GraduationCap, Trophy, ChevronRight, ChevronLeft, Check, Star, Zap, MapPin, BookOpen, Upload } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { FLAG_POSITIONS } from '../lib/positions';
import { fetchWithRefresh } from '../lib/api';

const FLAME   = '#ff5a2d';
const FLAME_S = '#ff8c66';
const INK     = '#0a0a0a';
const INK_2   = '#111111';
const INK_3   = '#161616';
const LINE    = 'rgba(255,255,255,0.07)';
const MUTED   = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP    = "'Barlow Condensed', sans-serif";
const BODY    = "'DM Sans', sans-serif";
const GRAIN   = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const SPORTS    = ['Flag Football', '7v7 Flag', 'Tackle Football'];
const POSITIONS = FLAG_POSITIONS;
const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030', '2031'];
const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const TOTAL_STEPS = 4;

const CONFETTI_COLORS = ['#ff5a2d', '#ff8c66', '#ffffff', '#ffd700', '#ff3399', '#4ade80'];
const CONFETTI = Array.from({ length: 52 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 720,
  y: -(Math.random() * 480 + 80),
  rx: Math.random() * 540,
  ry: Math.random() * 360,
  scl: Math.random() * 0.7 + 0.5,
  color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  w: Math.random() * 10 + 6,
  h: Math.random() * 6 + 4,
  delay: Math.random() * 0.55,
}));

const steps = [
  { num: 1, label: 'Your Game',  icon: Target,        sub: 'Sport & position' },
  { num: 2, label: 'School',     icon: GraduationCap, sub: 'School & grad year' },
  { num: 3, label: 'Stand Out',  icon: Trophy,        sub: 'GPA & achievements' },
  { num: 4, label: 'Launch',     icon: Zap,           sub: 'Profile live' },
];

const selectCls: React.CSSProperties = {
  width: '100%', background: INK_3, border: `1px solid ${LINE}`,
  borderRadius: 13, padding: '13px 16px', fontSize: '0.95rem',
  color: '#f4f4f2', fontFamily: BODY, outline: 'none',
  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
  transition: 'border-color 0.2s',
};

const inputCls: React.CSSProperties = {
  width: '100%', background: INK_3, border: `1px solid ${LINE}`,
  borderRadius: 13, padding: '13px 16px', fontSize: '0.95rem',
  color: '#f4f4f2', fontFamily: BODY, outline: 'none',
  transition: 'border-color 0.2s',
};

const labelCls: React.CSSProperties = {
  display: 'block', fontFamily: DISP, fontWeight: 800,
  fontSize: '.66rem', letterSpacing: '.18em', textTransform: 'uppercase',
  color: MUTED, marginBottom: 8,
};

function StyledInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={labelCls}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={e => { setFocused(true); e.target.style.borderColor = 'rgba(255,90,45,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,90,45,0.09)'; }}
        onBlur={e => { setFocused(false); e.target.style.borderColor = LINE; e.target.style.boxShadow = 'none'; }}
        style={{ ...inputCls, borderColor: focused ? 'rgba(255,90,45,0.55)' : LINE }}
      />
    </div>
  );
}

function StyledSelect({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelCls}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { e.target.style.borderColor = 'rgba(255,90,45,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,90,45,0.09)'; }}
        onBlur={e => { e.target.style.borderColor = LINE; e.target.style.boxShadow = 'none'; }}
        style={selectCls}
      >
        {children}
      </select>
    </div>
  );
}

// Projected rating shown in the onboarding preview. This is NOT the verified
// HERS Rating (that comes from logged performance) — it is a provisional number
// that only ever climbs as the athlete completes more of their profile. Never
// let it move backward, and show nothing until a position is picked.
function projectedRating(form: Record<string, string>, step: number): number | '—' {
  if (step < 1 || !form.position) return '—';
  let r = 60;                                              // base, once a position is set
  if (form.school && form.gradYear && form.state) r += 8;  // verified school details
  const gpa = parseFloat(form.gpa);
  if (!Number.isNaN(gpa)) r += Math.round((Math.min(Math.max(gpa, 0), 4) / 4) * 12); // up to +12 for a 4.0
  return Math.min(r, 99);
}

function ProfilePreview({ form, step, userName }: {
  form: Record<string, string>; step: number; userName: string;
}) {
  const rating = projectedRating(form, step);
  return (
    <div style={{
      background: `linear-gradient(160deg, ${INK_3}, ${INK_2})`,
      border: `1px solid ${LINE}`, borderRadius: 20, padding: 22,
      boxShadow: '0 24px 64px rgba(0,0,0,.6)',
    }}>
      {/* Header badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '.02em', color: '#f4f4f2' }}>
            {userName || 'Your Name'}
          </div>
          <AnimatePresence>
            {form.position && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ fontSize: '.76rem', color: MUTED, marginTop: 3, fontWeight: 600 }}
              >
                {form.position} · {form.sport}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.div
          animate={{ color: step >= 3 ? FLAME : MUTED_2 }}
          transition={{ duration: 0.4 }}
          style={{ fontFamily: DISP, fontWeight: 900, fontSize: '2rem', lineHeight: 1, textAlign: 'right' }}
        >
          {rating}
          <small style={{ display: 'block', fontSize: '.52rem', letterSpacing: '.16em', color: MUTED_2, fontWeight: 700 }}>PROJECTED RATING</small>
        </motion.div>
      </div>

      {/* Info rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          { icon: MapPin, text: [form.school, form.state].filter(Boolean).join(' · ') || 'School TBD', unlocked: step >= 2 },
          { icon: BookOpen, text: form.gradYear ? `Class of ${form.gradYear}` : 'Grad year TBD', unlocked: step >= 2 },
          { icon: Star, text: form.gpa ? `GPA ${form.gpa}` : 'GPA optional', unlocked: step >= 3 },
        ].map(({ icon: Icon, text, unlocked }) => (
          <div key={text} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <Icon size={13} style={{ color: unlocked ? FLAME_S : MUTED_2, flexShrink: 0, transition: 'color 0.4s' }} />
            <span style={{ fontSize: '.8rem', color: unlocked ? MUTED : MUTED_2, transition: 'color 0.4s' }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
        <motion.div
          animate={{ width: `${(step - 1) * 33.3}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ height: '100%', borderRadius: 9999, background: `linear-gradient(90deg,${FLAME},${FLAME_S})` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.66rem', color: MUTED_2, fontWeight: 700, fontFamily: DISP, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        <span>Profile Completion</span>
        <span style={{ color: FLAME }}>{(step - 1) * 33}%</span>
      </div>

      {/* Unlock badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
        {[
          { label: 'Position Ranked', active: step > 1 },
          { label: 'School Verified', active: step > 2 },
          { label: 'Profile Live',    active: step > 3 },
        ].map(({ label, active }) => (
          <div key={label} style={{
            padding: '4px 10px', borderRadius: 9999,
            background: active ? 'rgba(255,90,45,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active ? 'rgba(255,90,45,0.3)' : LINE}`,
            fontSize: '.62rem', fontFamily: DISP, fontWeight: 800,
            letterSpacing: '.1em', textTransform: 'uppercase',
            color: active ? FLAME_S : MUTED_2, transition: 'all 0.4s',
          }}>
            {active && <span style={{ marginRight: 4 }}>✓</span>}{label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [dir,    setDir]    = useState<1 | -1>(1);
  const [userName, setUserName] = useState('');
  const [form,   setForm]   = useState({
    sport: 'Flag Football', position: '', school: '',
    gradYear: '', state: '', gpa: '', achievements: '',
    photoUploaded: false, profileImageUrl: '',
  });
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u?.name) setUserName(u.name);
    } catch { /* noop */ }
  }, []);

  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const uploadPhoto = async (file: File) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setPhotoBusy(true);
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error || 'Upload failed');
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!putRes.ok) throw new Error('Upload failed');
      setForm(f => ({ ...f, photoUploaded: true, profileImageUrl: presign.publicUrl }));
    } catch (err) {
      showNotification('error', 'Photo upload failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setPhotoBusy(false);
    }
  };

  const canAdvance =
    (step === 1 && !!form.sport && !!form.position) ||
    (step === 2 && !!form.school && !!form.gradYear && !!form.state) ||
    step === 3 || step === 4;

  const goNext = () => { setDir(1);  setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const goBack = () => { setDir(-1); setStep(s => Math.max(s - 1, 1)); };

  const handleComplete = async () => {
    const userStr = localStorage.getItem('user');
    const token   = localStorage.getItem('token');
    const user    = userStr ? JSON.parse(userStr) : null;
    if (!user?.id || !token) {
      showNotification('error', 'Not signed in', 'Please log in again to finish setup.');
      navigate('/auth');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { ...form } as any;
      delete (body as any).photoUploaded;
      if (form.profileImageUrl) body.profileImage = form.profileImageUrl;
      delete (body as any).profileImageUrl;

      // [D-05] fetchWithRefresh injects the Bearer token and silently refreshes
      // on a 401, so no manual Authorization header is needed.
      const res  = await fetchWithRefresh(`/api/athletes/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        showNotification('error', 'Could not save', data?.error || 'Something went wrong.');
        setSaving(false);
        return;
      }
      showNotification('success', 'Profile complete', 'Your recruiting profile is live.');
      setDir(1);
      setStep(4);
    } catch {
      showNotification('error', 'Network error', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 36 }),
    center: { opacity: 1, x: 0 },
    exit:  (d: number) => ({ opacity: 0, x: d * -36 }),
  };

  return (
    <div style={{ minHeight: '100vh', background: INK, color: '#f4f4f2', fontFamily: BODY, overflowX: 'hidden', position: 'relative' }}>
      {/* Grain */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', opacity: 0.04, backgroundImage: GRAIN }} />

      {/* Glow blob */}
      <div style={{ position: 'fixed', width: 600, height: 600, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.18, top: '20%', left: '50%', transform: 'translate(-50%,-50%)', background: `radial-gradient(circle,${FLAME},transparent 65%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.04em', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => navigate('/')}>
          HERS<span style={{ color: FLAME }}>365</span>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {steps.map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <motion.div
                animate={{
                  background: s.num < step ? FLAME : s.num === step ? 'rgba(255,90,45,0.25)' : 'rgba(255,255,255,0.08)',
                  borderColor: s.num <= step ? FLAME : LINE,
                  scale: s.num === step ? 1.15 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `1.5px solid`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: DISP, fontWeight: 900, fontSize: '.72rem', letterSpacing: '.04em',
                  color: s.num < step ? '#fff' : s.num === step ? FLAME : MUTED_2,
                }}
              >
                {s.num < step ? <Check size={12} strokeWidth={3} /> : s.num}
              </motion.div>
              {s.num < 4 && (
                <motion.div
                  animate={{ background: s.num < step ? `linear-gradient(90deg,${FLAME},${FLAME_S})` : LINE }}
                  transition={{ duration: 0.4 }}
                  style={{ width: 24, height: 1.5, borderRadius: 9999 }}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: '.78rem', letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED_2 }}>
          Step {step} of {TOTAL_STEPS}
        </div>
      </header>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: step === 4 ? '1fr' : 'minmax(0,1fr) 340px', gap: 40, maxWidth: 960, margin: '0 auto', padding: '40px 28px', alignItems: 'start' }} className="ob-grid">

        {/* ── FORM PANEL ── */}
        <div style={{ minWidth: 0 }}>
          {step < 4 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {(() => { const S = steps[step - 1]; return <S.icon size={18} color={FLAME} />; })()}
                <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: '.78rem', letterSpacing: '.18em', textTransform: 'uppercase', color: FLAME }}>
                  Step {step} — {steps[step - 1].label}
                </span>
              </div>
              <h2 style={{ fontFamily: DISP, fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', textTransform: 'uppercase', lineHeight: 0.9, margin: 0, letterSpacing: '.01em' }}>
                {step === 1 && <>Tell us<br />about your<br /><span style={{ color: FLAME }}>Game.</span></>}
                {step === 2 && <>Where do<br />you<br /><span style={{ color: FLAME }}>Play?</span></>}
                {step === 3 && <>Make them<br />notice<br /><span style={{ color: FLAME }}>You.</span></>}
              </h2>
            </div>
          )}

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div>
                    <label style={labelCls}>Sport</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {SPORTS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set('sport', s)}
                          style={{
                            padding: '14px 10px', borderRadius: 13, border: `1.5px solid`,
                            borderColor: form.sport === s ? FLAME : LINE,
                            background: form.sport === s ? 'rgba(255,90,45,0.12)' : INK_3,
                            color: form.sport === s ? '#f4f4f2' : MUTED,
                            fontFamily: DISP, fontWeight: 800, fontSize: '.88rem',
                            letterSpacing: '.04em', cursor: 'pointer', transition: 'all 0.18s',
                            boxShadow: form.sport === s ? '0 4px 14px rgba(255,90,45,0.22)' : 'none',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                  <StyledSelect label="Position" value={form.position} onChange={v => set('position', v)}>
                    <option value="">Select your position</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </StyledSelect>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <StyledInput label="School" value={form.school} onChange={v => set('school', v)} placeholder="Lincoln High School" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <StyledSelect label="Grad Year" value={form.gradYear} onChange={v => set('gradYear', v)}>
                      <option value="">Year</option>
                      {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </StyledSelect>
                    <StyledSelect label="State" value={form.state} onChange={v => set('state', v)}>
                      <option value="">State</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </StyledSelect>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <label style={labelCls}>Profile photo <span style={{ color: MUTED_2, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
                    <button type="button" disabled={photoBusy} onClick={() => photoRef.current?.click()} style={{
                      width: '100%', padding: '24px', borderRadius: 13, cursor: 'pointer',
                      border: `2px dashed ${form.photoUploaded ? FLAME : LINE}`,
                      background: form.photoUploaded ? 'rgba(255,90,45,0.08)' : INK_3,
                      color: form.photoUploaded ? FLAME_S : MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <Upload size={18} />
                      {photoBusy ? 'Uploading…' : form.photoUploaded ? 'Photo added' : 'Upload photo'}
                    </button>
                  </div>
                  <StyledInput label="GPA (optional)" value={form.gpa} onChange={v => set('gpa', v)} placeholder="e.g. 3.8" />
                  <div>
                    <label style={labelCls}>Achievements <span style={{ color: MUTED_2, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      value={form.achievements}
                      onChange={e => set('achievements', e.target.value)}
                      placeholder="State champion, team captain, All-Conference..."
                      rows={5}
                      onFocus={e => { e.target.style.borderColor = 'rgba(255,90,45,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,90,45,0.09)'; }}
                      onBlur={e => { e.target.style.borderColor = LINE; e.target.style.boxShadow = 'none'; }}
                      style={{ ...inputCls, resize: 'none', display: 'block' }}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 4 — CELEBRATION ── */}
              {step === 4 && (
                <div style={{ textAlign: 'center', padding: '20px 0 40px', position: 'relative' }}>
                  {/* Confetti */}
                  <div style={{ position: 'fixed', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 50 }}>
                    {CONFETTI.map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: p.scl, rotate: 0 }}
                        animate={{ x: p.x, y: p.y, opacity: 0, scale: p.scl * 0.6, rotate: p.rx }}
                        transition={{ duration: 1.4, delay: p.delay, ease: [0.2, 0, 0.8, 1] }}
                        style={{
                          position: 'absolute', width: p.w, height: p.h,
                          borderRadius: 2, background: p.color, transformOrigin: 'center',
                        }}
                      />
                    ))}
                  </div>

                  {/* Check circle */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                    style={{
                      width: 96, height: 96, borderRadius: '50%', margin: '0 auto 32px',
                      background: `radial-gradient(circle,${FLAME},#cc3a12)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 0 0 rgba(255,90,45,0.5)`,
                      animation: 'ob-pulse 2s ease-out 0.4s',
                    }}
                  >
                    <Check size={44} color="#fff" strokeWidth={2.5} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <h2 style={{ fontFamily: DISP, fontWeight: 900, fontSize: 'clamp(2.8rem,6vw,4.2rem)', textTransform: 'uppercase', lineHeight: 0.88, letterSpacing: '.01em', margin: '0 0 14px' }}>
                      YOU'RE ON<br /><span style={{ color: FLAME }}>THE GRID.</span>
                    </h2>
                    <p style={{ color: MUTED, fontSize: '1.1rem', maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.65 }}>
                      Your recruiting profile is live. 380+ coaches are already scouting the grid. It's your time.
                    </p>
                  </motion.div>

                  {/* Stat strip */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 40 }}
                  >
                    {[{ n: '380+', l: 'Coaches watching' }, { n: '4.2K', l: 'Athletes ranked' }, { n: '365', l: 'Days a year' }].map(s => (
                      <div key={s.l} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.8rem', color: FLAME, lineHeight: 1 }}>{s.n}</div>
                        <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED_2, marginTop: 4 }}>{s.l}</div>
                      </div>
                    ))}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
                  >
                    <button
                      onClick={() => navigate('/profile')}
                      style={{
                        padding: '15px 32px', background: FLAME, color: '#fff', border: 'none',
                        borderRadius: 14, fontFamily: DISP, fontWeight: 900, fontSize: '1.05rem',
                        letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: '0 8px 28px rgba(255,90,45,.35)', transition: 'all .18s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(255,90,45,.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,90,45,.35)'; }}
                    >
                      View Your Profile <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => navigate('/feed')}
                      style={{
                        padding: '15px 32px', background: 'transparent', color: '#f4f4f2',
                        border: `1px solid ${LINE}`, borderRadius: 14,
                        fontFamily: DISP, fontWeight: 800, fontSize: '1.05rem',
                        letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
                        transition: 'all .18s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = FLAME; e.currentTarget.style.color = FLAME; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = '#f4f4f2'; }}
                    >
                      Go to The Grid
                    </button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          {step < 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 36 }}
            >
              <button
                onClick={goBack}
                disabled={step === 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 18px', borderRadius: 12, border: `1px solid ${LINE}`,
                  background: 'transparent', color: step === 1 ? 'transparent' : MUTED,
                  fontFamily: DISP, fontWeight: 800, fontSize: '.82rem',
                  letterSpacing: '.1em', textTransform: 'uppercase', cursor: step === 1 ? 'default' : 'pointer',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => { if (step > 1) e.currentTarget.style.borderColor = MUTED; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = LINE; }}
              >
                <ChevronLeft size={16} /> Back
              </button>

              {step < 3 ? (
                <button
                  onClick={goNext}
                  disabled={!canAdvance}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '13px 28px', background: canAdvance ? FLAME : INK_3,
                    color: canAdvance ? '#fff' : MUTED_2, border: 'none', borderRadius: 13,
                    fontFamily: DISP, fontWeight: 900, fontSize: '1rem',
                    letterSpacing: '.1em', textTransform: 'uppercase',
                    cursor: canAdvance ? 'pointer' : 'not-allowed', transition: 'all .2s',
                    boxShadow: canAdvance ? '0 6px 20px rgba(255,90,45,.3)' : 'none',
                  }}
                  onMouseEnter={e => { if (canAdvance) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(255,90,45,.45)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = canAdvance ? '0 6px 20px rgba(255,90,45,.3)' : 'none'; }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '13px 28px', background: FLAME, color: '#fff', border: 'none', borderRadius: 13,
                    fontFamily: DISP, fontWeight: 900, fontSize: '1rem',
                    letterSpacing: '.1em', textTransform: 'uppercase',
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                    boxShadow: '0 6px 20px rgba(255,90,45,.3)', transition: 'all .2s',
                  }}
                >
                  {saving
                    ? <><span className="auth-spinner" /> Saving...</>
                    : <><Check size={16} /> Launch Profile</>
                  }
                </button>
              )}
            </motion.div>
          )}

          {step < 4 && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => navigate('/profile')}
                style={{ background: 'none', border: 'none', color: MUTED_2, fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', transition: 'color .2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = MUTED; }}
                onMouseLeave={e => { e.currentTarget.style.color = MUTED_2; }}
              >
                Skip for now
              </button>
            </div>
          )}
        </div>

        {/* ── PROFILE PREVIEW PANEL (right, hidden on step 4 & mobile) ── */}
        {step < 4 && (
          <div className="ob-preview" style={{ position: 'sticky', top: 24 }}>
            <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: '.66rem', letterSpacing: '.18em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 14 }}>
              Live Preview
            </div>
            <ProfilePreview form={form} step={step} userName={userName} />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 720px) {
          .ob-grid { grid-template-columns: 1fr !important; }
          .ob-preview { display: none !important; }
        }
        .auth-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: auth-spin 0.65s linear infinite;
          display: inline-block; flex-shrink: 0;
        }
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes ob-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,90,45,0.5); }
          70%  { box-shadow: 0 0 0 18px rgba(255,90,45,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,90,45,0); }
        }
      `}</style>
    </div>
  );
}

export default Onboarding;
