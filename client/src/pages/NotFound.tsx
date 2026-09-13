import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-coral-500/30 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: '1.6rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#fff',
          }}
          className="mb-12"
        >
          HERS 365
        </span>

        {/* 404 */}
        <p className="text-8xl md:text-[10rem] font-black tracking-tighter text-coral-500/20 leading-none select-none">
          404
        </p>

        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mt-4 mb-4">
          Page Not Found
        </h1>

        <p className="text-ink-muted text-base md:text-lg max-w-md mb-10 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Head back to the platform.
        </p>

        <Link to="/">
          <button className="inline-flex items-center gap-3 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-coral-500/30 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Go Home
          </button>
        </Link>
      </motion.div>
    </div>
  );
};
