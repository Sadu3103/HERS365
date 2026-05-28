import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Target, Users, Play, ChevronRight, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, description }: any) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass-card p-8 group cursor-pointer"
  >
    <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-500 transition-colors duration-500">
      <Icon size={32} className="text-brand-400 group-hover:text-white transition-colors duration-500" />
    </div>
    <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-tight">{title}</h3>
    <p className="text-dark-300 leading-relaxed">{description}</p>
  </motion.div>
);

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-900 overflow-x-hidden pt-20">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-40 flex flex-col items-center text-center">
        {/* Background Effects */}
        <div className="absolute top-0 w-full h-[1000px] pointer-events-none overflow-hidden opacity-30 select-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-premium mb-8 border-brand-500/20">
            <Zap size={16} className="text-brand-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-400">Future of Women's Football</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter uppercase leading-[0.9]">
            The Elite <br />
            <span className="text-gradient-glow italic">Pipeline</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-dark-300 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            The world's most advanced platform for female high school athletes, recruiters, and fans. 
            Bridging talent with opportunity through data, compliance, and community.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link to="/auth">
              <button className="px-10 py-5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-brand-500/30 flex items-center gap-3 group">
                Enter Platform
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-10 py-5 glass-premium hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3">
              <Play size={20} />
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-24 mt-32 max-w-6xl mx-auto w-full px-4"
        >
          {[
            { label: 'Athletes', val: '50K+' },
            { label: 'Recruiters', val: '2.5K' },
            { label: 'Scholarships', val: '$12M' },
            { label: 'Matches', val: '100%' },
          ].map((stat, i) => (
            <div key={i} className="text-center group">
              <h4 className="text-4xl md:text-5xl font-black text-white mb-2 group-hover:text-brand-400 transition-colors">{stat.val}</h4>
              <p className="text-xs uppercase tracking-[0.4em] text-dark-400 font-bold">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-32 bg-dark-800/10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <span className="text-brand-500 font-black uppercase tracking-[0.5em] text-sm">Enterprise Core</span>
            <h2 className="text-4xl md:text-6xl font-black text-white mt-4 tracking-tighter uppercase leading-none">
              Built for the <br />
              Next Generation
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield} 
              title="COPPA Compliant" 
              description="Privacy-first architecture ensuring safety for high school athletes under 18 with rigorous data protection." 
            />
            <FeatureCard 
              icon={Target} 
              title="Recruiting Analytics" 
              description="Proprietary matching algorithms that connect the right athletes with the right college programs." 
            />
            <FeatureCard 
              icon={Globe} 
              title="Global Network" 
              description="Reach beyond your zip code. Get scouted by coaches from across the nation in our unified ecosystem." 
            />
          </div>
        </div>
      </section>

      {/* Trust & Compliance Banner */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-16 gap-y-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
           {/* Add partner/investor logos here */}
           <div className="text-2xl font-black uppercase text-dark-400 tracking-[0.3em]">Compliance Verified</div>
           <div className="flex items-center gap-2">
             <Lock size={20} className="text-brand-500" />
             <span className="font-bold text-white uppercase tracking-widest">AES-256 Encrypted</span>
           </div>
           <div className="text-2xl font-black uppercase text-dark-400 tracking-[0.3em]">NIL Framework v2.0</div>
        </div>
      </section>
    </div>
  );
};
