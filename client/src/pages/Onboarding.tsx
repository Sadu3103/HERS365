import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Upload, User, Activity, BookOpen, Camera } from 'lucide-react';

const POSITIONS = ['QB', 'WR', 'Center', 'Rusher', 'Safety', 'Corner', 'Linebacker', 'Kicker'];
const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

interface FormData {
  position: string;
  gradYear: string;
  school: string;
  height: string;
  weight: string;
  fortyTime: string;
  gpa: string;
  major: string;
  satScore: string;
  photoUploaded: boolean;
}

const steps = [
  { label: 'Position', icon: User },
  { label: 'Physical', icon: Activity },
  { label: 'Academic', icon: BookOpen },
  { label: 'Photo', icon: Camera },
];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    position: '',
    gradYear: '',
    school: '',
    height: '',
    weight: '',
    fortyTime: '',
    gpa: '',
    major: '',
    satScore: '',
    photoUploaded: false,
  });

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const canAdvance = () => {
    if (step === 0) return form.position && form.gradYear && form.school.trim();
    if (step === 1) return form.height && form.weight;
    if (step === 2) return form.gpa;
    return true;
  };

  const finish = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      });
    } catch {
      // non-blocking — navigate regardless
    }
    navigate('/profile');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Wordmark */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 28, color: '#ff5a2d', letterSpacing: 2 }}>
          HERS365
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
          Set up your athlete profile
        </div>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done ? '#ff5a2d' : active ? 'rgba(255,90,45,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${done || active ? '#ff5a2d' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.2s',
              }}>
                {done ? <Check size={16} color="#fff" /> : <Icon size={16} color={active ? '#ff5a2d' : 'rgba(255,255,255,0.3)'} />}
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  width: 48,
                  height: 2,
                  background: i < step ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: '#111',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '32px 28px',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#ff5a2d', textTransform: 'uppercase', marginBottom: 6 }}>
            Step {step + 1} of {steps.length}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{steps[step].label}</div>
        </div>

        {/* Step 0 — Position */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Position</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {POSITIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => setForm(f => ({ ...f, position: p }))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: `1.5px solid ${form.position === p ? '#ff5a2d' : 'rgba(255,255,255,0.1)'}`,
                      background: form.position === p ? 'rgba(255,90,45,0.12)' : 'transparent',
                      color: form.position === p ? '#ff5a2d' : 'rgba(255,255,255,0.6)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Graduation Year</label>
              <select value={form.gradYear} onChange={set('gradYear')} style={selectStyle}>
                <option value="">Select year</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>High School / College</label>
              <input
                type="text"
                placeholder="School name"
                value={form.school}
                onChange={set('school')}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Step 1 — Physical */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Height</label>
                <input type="text" placeholder='e.g. 5\'7"' value={form.height} onChange={set('height')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weight (lbs)</label>
                <input type="number" placeholder="135" value={form.weight} onChange={set('weight')} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>40-Yard Dash (optional)</label>
              <input type="text" placeholder="e.g. 4.65" value={form.fortyTime} onChange={set('fortyTime')} style={inputStyle} />
            </div>
          </div>
        )}

        {/* Step 2 — Academic */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>GPA</label>
              <input type="text" placeholder="e.g. 3.8" value={form.gpa} onChange={set('gpa')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intended Major (optional)</label>
              <input type="text" placeholder="e.g. Kinesiology" value={form.major} onChange={set('major')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>SAT / ACT Score (optional)</label>
              <input type="text" placeholder="SAT 1200 or ACT 26" value={form.satScore} onChange={set('satScore')} style={inputStyle} />
            </div>
          </div>
        )}

        {/* Step 3 — Photo */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
            <div
              onClick={() => setForm(f => ({ ...f, photoUploaded: true }))}
              style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                border: `2px dashed ${form.photoUploaded ? '#ff5a2d' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                background: form.photoUploaded ? 'rgba(255,90,45,0.08)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.2s',
              }}
            >
              {form.photoUploaded
                ? <Check size={32} color="#ff5a2d" />
                : <Upload size={28} color="rgba(255,255,255,0.3)" />}
              <span style={{ fontSize: 12, color: form.photoUploaded ? '#ff5a2d' : 'rgba(255,255,255,0.3)' }}>
                {form.photoUploaded ? 'Photo ready' : 'Upload photo'}
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
              A clear headshot helps coaches recognize you. You can skip this and add it later.
            </p>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} style={ghostBtnStyle}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              style={{ ...primaryBtnStyle, opacity: canAdvance() ? 1 : 0.4 }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={finish} style={primaryBtnStyle}>
              Go to Profile <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Skip */}
      <button
        onClick={() => navigate('/profile')}
        style={{ marginTop: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
      >
        Skip for now
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 20px',
  background: '#ff5a2d',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 16px',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.6)',
  fontSize: 14,
  cursor: 'pointer',
};
