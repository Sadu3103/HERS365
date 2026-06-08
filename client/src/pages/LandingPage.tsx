import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Shield, Target, Users, ChevronRight, Trophy, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <motion.div
    whileHover={{ y: -6 }}
    className="k-card-hover p-8 group"
  >
    <div className="w-14 h-14 rounded-2xl bg-coral-500/15 flex items-center justify-center mb-6 group-hover:bg-coral-500 transition-colors duration-300">
      <Icon size={28} className="text-coral-400 group-hover:text-white transition-colors duration-300" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-ink">{title}</h3>
    <p className="text-ink-muted leading-relaxed">{description}</p>
  </motion.div>
);

interface MomentumFact {
  icon: LucideIcon;
  stat: string;
  detail: string;
}

const MOMENTUM_FACTS: MomentumFact[] = [
  {
    icon: Medal,
    stat: '2028 Olympics',
    detail: 'Flag football joins the Los Angeles Games as a medal sport.',
  },
  {
    icon: Trophy,
    stat: 'NCAA emerging sport',
    detail: "Women's flag football is on the NCAA's path to championship status.",
  },
  {
    icon: Shield,
    stat: 'Varsity and growing',
    detail: 'Now a sanctioned high-school sport in a growing number of states.',
  },
];

interface Step {
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    title: 'Build your profile',
    description: 'Add your positions, stats, school, and class year to a verified athlete profile.',
  },
  {
    title: 'Upload your film',
    description: 'Post game film and highlights that college coaches can actually evaluate.',
  },
  {
    title: 'Climb the rankings',
    description: 'Your stats and film feed your ranking so coaches can discover you by position.',
  },
  {
    title: 'Connect with coaches',
    description: 'Message college programs directly and keep every recruiting conversation in one place.',
  },
];

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden pt-20">
      {/* Hero */}
      <section className="relative px-6 py-24 md:py-36 flex flex-col items-center text-center">
        {/* Coral radial glow */}
        <div className="absolute top-0 w-full h-[1000px] pointer-events-none overflow-hidden opacity-30 select-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-coral-500/20 blur-[150px]" />
          <div className="absolute bottom-0 right-[-10%] w-[50%] h-[50%] rounded-full bg-coral-600/15 blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-card/60 border border-coral-500/20 backdrop-blur-xl mb-8">
            <Medal size={15} className="text-coral-400" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral-400">
              Girls&apos; Flag Football Recruiting
            </span>
          </div>

          <h1 className="k-display text-6xl md:text-8xl mb-8 leading-[0.92]">
            Get seen.
            <br />
            <span className="bg-gradient-to-r from-coral-400 to-coral-600 bg-clip-text text-transparent">
              Get recruited.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-ink-muted mb-12 max-w-2xl mx-auto leading-relaxed">
            HERS365 is where high-school girls who play flag football build a verified athlete
            profile, share game film and stats, and put their game in front of college coaches who
            are actively recruiting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="px-9 py-4 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold tracking-wide transition-all shadow-xl shadow-coral-500/25 flex items-center gap-2 group">
              Create your profile
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
            <Link to="/rankings" className="px-9 py-4 rounded-xl bg-surface-card/60 border border-surface-border backdrop-blur-xl hover:bg-surface-hover text-ink font-semibold tracking-wide transition-all flex items-center gap-2">
              Browse rankings
            </Link>
          </div>
        </motion.div>

        {/* Momentum facts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-28 max-w-5xl mx-auto w-full"
        >
          {MOMENTUM_FACTS.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.stat} className="k-card p-6 text-left">
                <Icon size={22} className="text-coral-400 mb-4" aria-hidden="true" />
                <p className="text-lg font-semibold text-ink mb-1">{fact.stat}</p>
                <p className="text-sm text-ink-muted leading-relaxed">{fact.detail}</p>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* What you get */}
      <section className="px-6 py-28 bg-surface-card/10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <span className="k-label text-coral-500">What you get</span>
            <h2 className="k-display text-4xl md:text-5xl text-ink mt-3 leading-tight">
              Everything you need to get recruited
            </h2>
            <p className="text-ink-muted mt-4 leading-relaxed">
              Built for the athlete first, with the safeguards parents expect and the data coaches
              actually use to evaluate talent.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Shield}
              title="A verified profile"
              description="Confirm your stats, positions, and film so coaches can trust what they see. Identity and age safeguards are built in from day one."
            />
            <FeatureCard
              icon={Target}
              title="Real recruiting tracking"
              description="See which programs viewed your profile, follow the schools recruiting your position, and keep every coach conversation in one place."
            />
            <FeatureCard
              icon={Users}
              title="Reach beyond your zip code"
              description="Your highlights and rankings travel further than a local season ever could, putting your game in front of coaches across the country."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-28">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <span className="k-label text-coral-500">How it works</span>
            <h2 className="k-display text-4xl md:text-5xl text-ink mt-3 leading-tight">
              From first profile to first offer
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="k-card p-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-coral-500/15 flex items-center justify-center mb-6" aria-hidden="true">
                  <span className="text-xl font-bold text-coral-400">{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-ink">{step.title}</h3>
                <p className="text-ink-muted leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-28 border-t border-surface-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="k-display text-4xl md:text-5xl text-ink leading-tight mb-5">
            Your season is recruiting tape
          </h2>
          <p className="text-ink-muted leading-relaxed mb-10">
            The sport is heading to the Olympics and the NCAA. Start building the profile that turns
            the plays you make this year into your next opportunity.
          </p>
          <Link to="/auth" className="px-9 py-4 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold tracking-wide transition-all shadow-xl shadow-coral-500/25 inline-flex items-center gap-2 group">
            Create your profile
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};
