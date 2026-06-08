import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, ChevronRight, ChevronLeft, Check, Trophy,
  GraduationCap, Target,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const SPORTS = ['Flag Football', '7v7 Flag', 'Tackle Football'];
const POSITIONS = ['QB', 'WR', 'RB', 'Center', 'Rusher', 'Safety', 'Cornerback', 'Blitzer'];
const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030', '2031'];
const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const TOTAL_STEPS = 4;

const labelCls = 'text-xs font-black uppercase tracking-[0.2em] text-ink-muted ml-1';
const inputCls =
  'w-full bg-surface px-4 py-3.5 rounded-2xl border border-surface-border text-ink ' +
  'placeholder:text-ink-faint focus:border-coral-500 focus:outline-none transition-colors';

export function Onboarding() {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sport: 'Flag Football',
    position: '',
    school: '',
    gradYear: '',
    state: '',
    gpa: '',
    achievements: '',
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const canAdvance =
    (step === 1 && form.sport && form.position) ||
    (step === 2 && form.school && form.gradYear && form.state) ||
    step === 3 ||
    step === 4;

  const handleComplete = async () => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user?.id || !token) {
      showNotification('error', 'Not signed in', 'Please log in again to finish setup.');
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/athletes/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        showNotification('error', 'Could not save', data.error || 'Something went wrong.');
        setSaving(false);
        return;
      }

      showNotification('success', 'Profile complete', 'Your recruiting profile is live.');
      setStep(4);
    } catch {
      showNotification('error', 'Network error', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-coral-500/10 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl max-w-xl w-full p-8 md:p-12 relative z-10"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-coral-500 rounded-2xl flex items-center justify-center shadow-lg shadow-coral-500/30">
            <Zap className="text-white fill-current" size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-coral-400">HERS365</p>
            <h1 className="text-xl font-black text-ink uppercase tracking-tight font-display">
              Build your profile
            </h1>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-10">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
              <motion.div
                className="h-full bg-coral-500"
                initial={false}
                animate={{ width: i < step ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-coral-400">
                  <Target size={18} />
                  <span className="text-sm font-black uppercase tracking-wider">Step 1 — Your game</span>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Sport</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SPORTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set('sport', s)}
                        className={`py-3 px-2 rounded-2xl text-sm font-bold transition-colors border ${
                          form.sport === s
                            ? 'bg-coral-500 border-coral-500 text-white'
                            : 'bg-surface border-surface-border text-ink-muted hover:border-coral-500/50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => set('position', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select your position</option>
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-coral-400">
                  <GraduationCap size={18} />
                  <span className="text-sm font-black uppercase tracking-wider">Step 2 — School</span>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>School</label>
                  <input
                    value={form.school}
                    onChange={(e) => set('school', e.target.value)}
                    placeholder="e.g. Lincoln High School"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelCls}>Grad year</label>
                    <select
                      value={form.gradYear}
                      onChange={(e) => set('gradYear', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Year</option>
                      {GRAD_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>State</label>
                    <select
                      value={form.state}
                      onChange={(e) => set('state', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">State</option>
                      {STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-coral-400">
                  <Trophy size={18} />
                  <span className="text-sm font-black uppercase tracking-wider">Step 3 — Stand out</span>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>GPA <span className="text-ink-faint normal-case tracking-normal">(optional)</span></label>
                  <input
                    value={form.gpa}
                    onChange={(e) => set('gpa', e.target.value)}
                    placeholder="e.g. 3.8"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Achievements <span className="text-ink-faint normal-case tracking-normal">(optional)</span></label>
                  <textarea
                    value={form.achievements}
                    onChange={(e) => set('achievements', e.target.value)}
                    placeholder="State champion, team captain, All-Conference..."
                    rows={4}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-6 space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  className="w-20 h-20 bg-coral-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-coral-500/40"
                >
                  <Check className="text-white" size={40} strokeWidth={3} />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-black text-ink uppercase tracking-tight font-display">
                    You're on the board
                  </h2>
                  <p className="text-ink-muted mt-2">
                    Your recruiting profile is live. Coaches can find you now.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] transition-colors flex items-center justify-center gap-2"
                >
                  Go to your profile <ChevronRight size={20} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons (hidden on the done screen) */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-10">
            <button
              onClick={back}
              disabled={step === 1}
              className="flex items-center gap-1 px-4 py-2.5 rounded-2xl text-ink-muted font-bold uppercase tracking-wider text-sm transition-colors hover:text-ink disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft size={18} /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={next}
                disabled={!canAdvance}
                className="flex items-center gap-2 px-8 py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-sm transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving ? 'Saving...' : 'Finish'} <Check size={18} />
              </button>
            )}
          </div>
        )}

        {/* Skip for now */}
        {step < 4 && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/profile')}
              className="text-ink-faint hover:text-ink-muted text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </motion.div>

    </div>
  );
}

export default Onboarding;

