import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';

const FLAME_C = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type FAQ = { q: string; a: string; cat: string };
const FAQS: FAQ[] = [
  { cat: 'Account', q: 'How do I create an account?', a: 'Tap "Get Started" on the home page and enter your email or sign in with Google. Athletes under 13 require a parent to complete registration.' },
  { cat: 'Account', q: 'Is HERS365 free to use?', a: 'Yes, the core platform is free. A Pro subscription ($9.99/month) unlocks unlimited highlight uploads, coach messaging, and advanced analytics.' },
  { cat: 'Recruiting', q: 'How does the recruiting process work?', a: 'Coaches can find and follow athletes on the platform. All coach-to-athlete contact is gated through a parent guardian account for safety. Athletes can also reach out to coaches directly.' },
  { cat: 'Recruiting', q: 'How is my ranking calculated?', a: 'Your G5 Rating is based on game stats, highlight quality, combine measurables, academic record, and HERS365 activity score. Rankings update weekly.' },
  { cat: 'Safety', q: 'Is the platform safe for minors?', a: 'Safety is our top priority. All coach communication is gated through parents. No minor's contact info is exposed without parental consent. We are COPPA and FERPA compliant.' },
  { cat: 'Safety', q: 'Can coaches contact athletes directly?', a: 'No. All coach-to-athlete messages are routed through the parent/guardian account first. Parents must approve any connection before direct communication is enabled.' },
  { cat: 'Technical', q: 'How do I upload a highlight video?', a: 'Go to your Profile, tap "Add Highlight", and upload up to 2-minute clips. Free accounts get 3 highlights. Pro accounts get unlimited uploads with auto-trim and tagging.' },
  { cat: 'Technical', q: 'Why can't I see a coach's profile?', a: 'Coaches are verified by HERS365 before appearing on the platform. If a coach's profile is restricted, they may be pending verification or deactivated.' },
];

const CATS = ['All', ...Array.from(new Set(FAQS.map((f) => f.cat)))];

export const Help = () => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<number | null>(null);

  const filtered = FAQS.filter((f) => {
    if (cat !== 'All' && f.cat !== cat) return false;
    if (search && !f.q.toLowerCase().includes(search.toLowerCase()) && !f.a.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}>
          <HelpCircle size={13} /> HELP CENTER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>How Can We Help?</h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>Find answers to common questions about HERS365.</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED_2 }} />
        <input className="k-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs..." style={{ width: '100%', padding: '10px 12px 10px 36px' }} />
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATS.map((c) => <motion.button key={c} whileTap={{ scale: 0.94 }} onClick={() => setCat(c)} style={{ padding: '5px 12px', borderRadius: 99, border: 'none', background: cat === c ? FLAME_C : 'rgba(255,255,255,0.05)', color: cat === c ? '#fff' : MUTED, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>{c}</motion.button>)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((faq, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${open === i ? `${FLAME_C}40` : LINE}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: open === i ? '#f4f4f2' : '#ccc', textAlign: 'left', lineHeight: 1.4 }}>{faq.q}</span>
              {open === i ? <ChevronUp size={16} color={FLAME_C} /> : <ChevronDown size={16} color={MUTED_2} />}
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '0 18px 16px', fontSize: '0.83rem', color: MUTED, lineHeight: 1.65 }}>{faq.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem' }}>No FAQs match your search.</div>}
      </div>
    </div>
  );
};
