import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Upload, Play, Pause, Tag, ChevronRight, CheckCircle2, X, Plus } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const INK_2 = '#111111';
const DISP = "'Barlow Condensed', sans-serif";

type Step = 'upload' | 'details' | 'publish';

const TAG_OPTIONS = ['Highlight', 'TD', 'Route', 'Defense', 'Speed', 'Training', 'Game Film', '7v7'];

export const VideoStudio = () => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('video/')) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep('details');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const toggleTag = (t: string) => {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const publish = async () => {
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setUploading(false);
    setPublished(true);
    setStep('publish');
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setTitle('');
    setTags([]);
    setPublished(false);
    setStep('upload');
    setPlaying(false);
  };

  const STEPS: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'details', label: 'Details' },
    { id: 'publish', label: 'Publish' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <Video size={13} /> VIDEO STUDIO
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Post Your Highlight.
        </h1>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Upload game film, training clips, or reels. Coaches see your best moments.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = STEPS.findIndex((x) => x.id === step) > i;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? FLAME : active ? `${FLAME}22` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${done || active ? FLAME : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: done ? '#fff' : active ? FLAME : MUTED, flexShrink: 0 }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: active ? 700 : 500, color: active ? '#f4f4f2' : MUTED_2 }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} color={LINE} style={{ margin: '0 8px' }} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? FLAME : LINE}`,
                borderRadius: 18, padding: '52px 32px', textAlign: 'center',
                background: dragOver ? `${FLAME}08` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <Upload size={36} color={dragOver ? FLAME : MUTED_2} style={{ marginBottom: 14 }} />
              <div style={{ fontFamily: DISP, fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
                {dragOver ? 'Drop to Upload' : 'Upload Your Clip'}
              </div>
              <div style={{ color: MUTED, fontSize: '0.82rem', marginBottom: 16 }}>Drag & drop or tap to browse — MP4, MOV, up to 500 MB</div>
              <motion.div whileTap={{ scale: 0.96 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: FLAME, color: '#fff', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, fontFamily: DISP, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <Plus size={14} /> Choose File
              </motion.div>
            </div>

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { title: 'Highlight Clips', desc: 'Best plays from games' },
                { title: 'Training Film', desc: 'Route work, drills, conditioning' },
                { title: 'Game Reels', desc: 'Full drive or red zone series' },
              ].map((c) => (
                <div key={c.title} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e4e4e2', marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: '0.7rem', color: MUTED_2 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* DETAILS STEP */}
        {step === 'details' && file && previewUrl && (
          <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Video preview */}
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', marginBottom: 20, aspectRatio: '16/9' }}>
              <video ref={videoRef} src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onEnded={() => setPlaying(false)} />
              <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: playing ? 'transparent' : 'rgba(0,0,0,0.4)' }}>
                {!playing && (
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: FLAME, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={22} color="#fff" fill="#fff" />
                  </div>
                )}
              </div>
              {playing && (
                <button onClick={togglePlay} style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <Pause size={16} />
                </button>
              )}
              <button onClick={reset} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ background: INK_2, border: `1px solid ${LINE}`, borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 8 }}>Title</div>
              <input className="k-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Route running vs Oak Hill — Week 4" maxLength={80} style={{ width: '100%', padding: '10px 14px', marginBottom: 18 }} />

              <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 10 }}>
                <Tag size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {TAG_OPTIONS.map((t) => (
                  <motion.button key={t} whileTap={{ scale: 0.93 }} onClick={() => toggleTag(t)} style={{ padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', background: tags.includes(t) ? FLAME : 'rgba(255,255,255,0.06)', color: tags.includes(t) ? '#fff' : MUTED, fontSize: '0.72rem', fontWeight: 700 }}>{t}</motion.button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={reset} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${LINE}`, borderRadius: 10, color: MUTED, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', flex: 0 }}>Back</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={publish} disabled={!title.trim() || uploading} style={{ flex: 1, padding: '12px 24px', background: title.trim() ? FLAME : 'rgba(255,90,45,0.3)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, fontFamily: DISP, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: title.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {uploading ? (
                  <><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />Uploading…</>
                ) : 'Publish Clip'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* PUBLISH STEP */}
        {step === 'publish' && published && (
          <motion.div key="publish" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '32px 24px' }}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
              <CheckCircle2 size={52} color="#4ade80" style={{ marginBottom: 18 }} />
            </motion.div>
            <h2 style={{ fontFamily: DISP, fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 10px' }}>Clip Published!</h2>
            <p style={{ color: MUTED, fontSize: '0.88rem', marginBottom: 28 }}>"{title}" is live on your profile and visible to coaches.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={reset} style={{ padding: '11px 22px', background: FLAME, color: '#fff', border: 'none', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Upload Another</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} style={{ padding: '11px 22px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${LINE}`, borderRadius: 99, fontSize: '0.8rem', color: MUTED, fontWeight: 600, cursor: 'pointer' }}>View My Profile</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
