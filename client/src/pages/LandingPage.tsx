import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Target, Play, ChevronRight, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <motion.div
    whileHover={{ y: -10 }}
    className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-8 group cursor-pointer"
  >
    <div className="w-16 h-16 bg-coral-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-coral-500 transition-colors duration-500">
      <Icon size={32} className="text-coral-400 group-hover:text-white transition-colors duration-500" />
    </div>
    <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-tight">{title}</h3>
    <p className="text-ink-muted leading-relaxed">{description}</p>
  </motion.div>
);

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">

      {/* Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-surface/80 backdrop-blur-xl border-b border-white/5">
        <span className="font-black text-xl uppercase tracking-tighter text-white">HERS<span className="text-coral-400">365</span></span>
        <Link to="/auth">
          <button className="px-5 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-black uppercase tracking-[0.15em] text-sm transition-all">
            Sign Up Free
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-40 pb-24 md:pb-40 flex flex-col items-center text-center">
        {/* Background Effects */}
        <div className="absolute top-0 w-full h-[1000px] pointer-events-none overflow-hidden opacity-30 select-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-coral-500/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-[-10%] w-[50%] h-[50%] bg-green-500/20 rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-card/60 border border-surface-border backdrop-blur-xl mb-8 border-coral-500/20">
            <Zap size={16} className="text-coral-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-coral-400">Girls Flag Football Recruiting — Now Open</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter uppercase leading-[0.9]">
            Your Film. <br />
            <span className="bg-gradient-to-r from-coral-400 to-coral-600 bg-clip-text text-transparent italic">Their Offer.</span>
          </h1>

          <p className="text-xl md:text-2xl text-ink-muted mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            Build your recruiting profile, upload your game film, and get in front of college coaches looking for players exactly like you.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link to="/auth">
              <button className="px-10 py-5 bg-coral-500 hover:bg-coral-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-coral-500/30 flex items-center gap-3 group">
                Build Your Profile
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            {/* TODO: Replace URL with the real HERS365 demo video before launch */}
            <button
              onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
              className="px-10 py-5 bg-surface-card/60 border border-surface-border backdrop-blur-xl hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3"
            >
              <Play size={20} />
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Early Adopter Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="flex flex-col items-center gap-6 mt-32 max-w-2xl mx-auto w-full px-4"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-ink-muted font-bold">Be among the first</p>
          <div className="grid grid-cols-3 gap-12 w-full">
            {[
              { label: 'Spots Available', val: '500' },
              { label: 'States Represented', val: '12' },
              { label: 'Launch Season', val: "Fall '26" },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <h4 className="text-4xl md:text-5xl font-black text-white mb-2 group-hover:text-coral-400 transition-colors">{stat.val}</h4>
                <p className="text-xs uppercase tracking-[0.4em] text-ink-muted font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-muted font-medium">Founding athletes get priority visibility with every coach on the platform.</p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-32 bg-surface-card/10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <span className="text-coral-500 font-black uppercase tracking-[0.5em] text-sm">Your Recruiting Edge</span>
            <h2 className="text-4xl md:text-6xl font-black text-white mt-4 tracking-tighter uppercase leading-none">
              Built for the <br />
              Next Generation
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Play}
              title="Film That Gets Seen"
              description="Upload your best plays and build a highlight reel coaches can watch in 60 seconds. No email attachments. No lost tapes. Just your game, front and center."
            />
            <FeatureCard
              icon={Zap}
              title="Message Coaches Directly"
              description="Find programs that fit your size, GPA, and position — then reach out in one click. No middleman. No waiting to get discovered. You make the first move."
            />
            <FeatureCard
              icon={Target}
              title="Stats Coaches Trust"
              description="Link your MaxPreps profile, drop your combine numbers, and log your 40 time. Coaches see verified data, not just your word for it."
            />
          </div>
        </div>
      </section>

      {/* Trust & Compliance Banner */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-coral-500" />
            <span className="font-bold text-white/60 uppercase tracking-widest text-sm">Free during beta</span>
          </div>
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-coral-500" />
            <span className="font-bold text-white/60 uppercase tracking-widest text-sm">Direct coach contact — no middleman</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-coral-500" />
            <span className="font-bold text-white/60 uppercase tracking-widest text-sm">Built specifically for flag football</span>
          </div>
        </div>
      </section>

    </div>
  );
};
