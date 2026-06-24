import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

const FLAME_C = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const DISP = "'Barlow Condensed', sans-serif";

export const Contact = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!form.email.includes('@') || !form.email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}>
          <Mail size={13} /> CONTACT
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1 }}>Get In Touch.</h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>Questions, feedback, or press? We respond within 24 hours.</p>
      </div>

      {sent ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 16 }}>
          <CheckCircle2 size={40} color="#4ade80" style={{ marginBottom: 16 }} />
          <h3 style={{ fontFamily: DISP, fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 8px' }}>Message Sent!</h3>
          <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>We'll get back to you at {form.email} within 24 hours.</p>
        </motion.div>
      ) : (
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { key: 'name', label: 'Name', placeholder: 'Your full name', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'you@email.com', type: 'email' },
            ].map((f) => (
              <div key={f.key}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 7 }}>{f.label}</div>
                <input className="k-input" type={f.type} placeholder={f.placeholder} required value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={{ width: '100%', padding: '10px 14px' }} />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 7 }}>Subject</div>
            <input className="k-input" placeholder="What's this about?" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 7 }}>Message</div>
            <textarea className="k-input" rows={5} placeholder="Your message..." required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} style={{ width: '100%', padding: '10px 14px', resize: 'vertical' }} />
          </div>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: '0.83rem', color: '#f87171' }}>
              {error}
            </div>
          )}
          <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={loading} className="k-btn k-btn-primary" style={{ padding: '13px 24px', borderRadius: 10, fontSize: '0.85rem', fontFamily: DISP, letterSpacing: '0.06em', textTransform: 'uppercase', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            <Send size={15} /> {loading ? 'Sending...' : 'Send Message'}
          </motion.button>
        </form>
      )}

      <div style={{ marginTop: 40, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { icon: <Mail size={18} />, label: 'Email', val: 'hello@hers365.com' },
          { icon: <MessageSquare size={18} />, label: 'Instagram', val: '@HERS365' },
        ].map((c) => (
          <div key={c.label} style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ color: FLAME_C, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f4f4f2' }}>{c.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
