import React from 'react';
import { motion } from 'framer-motion';
import { Construction, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UnderConstructionProps {
  pageName: string;
}

export const UnderConstruction: React.FC<UnderConstructionProps> = ({ pageName }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="w-24 h-24 bg-coral-500/10 rounded-3xl flex items-center justify-center mb-8 border border-coral-500/20 shadow-lg shadow-coral-500/10"
      >
        <Construction size={48} className="text-coral-500 animate-bounce" />
      </motion.div>

      <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
        {pageName} <br />
        <span className="bg-gradient-to-r from-coral-400 to-coral-600 bg-clip-text text-transparent italic">Under Construction</span>
      </h2>
      
      <p className="text-ink-muted max-w-md mx-auto mb-10 font-medium leading-relaxed">
        We're currently building out this section of the grid. Check back soon for elite performance tools and recruiting analytics.
      </p>

      <div className="flex gap-4">
        <Link to="/">
          <button className="flex items-center gap-2 px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-coral-500/20">
            <Home size={18} />
            Back to Feed
          </button>
        </Link>
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-6 py-3 bg-surface-card/60 border border-surface-border rounded-2xl backdrop-blur-xl hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-widest transition-all border border-white/5"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-coral-500/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
};
