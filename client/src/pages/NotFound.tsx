import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Coral glow blob */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-coral-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 text-center px-6 max-w-lg mx-auto"
      >
        <span className="sr-only">404 — Page not found</span>

        {/* 404 display number */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-[10rem] leading-none font-black uppercase text-coral-500 k-glow-coral select-none"
        >
          404
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="font-display text-3xl font-black uppercase tracking-tight text-white mt-2 mb-3"
        >
          This play didn't connect.
        </motion.h1>

        {/* Supporting sentence */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-ink-muted font-medium text-base mb-10"
        >
          The page you're looking for isn't on the roster. Head back and run a new route.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Primary CTA */}
          <Link
            to="/"
            aria-label="Back to The Grid — go to homepage"
            className="inline-flex items-center gap-3 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-coral-500/30 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            Back to The Grid
            <ChevronRight aria-hidden="true" size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Secondary link */}
          <Link
            to="/rankings"
            className="text-sm text-ink-muted font-semibold uppercase tracking-widest hover:text-white underline-offset-4 hover:underline transition-colors"
          >
            View Rankings
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};
