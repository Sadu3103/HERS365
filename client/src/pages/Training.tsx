
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Target,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  Circle,
  TrendingUp,
  Award,
  Flame,
  Timer,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrainingProgram {
  id: number;
  name: string;
  description: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  category: string;
  progress: number;
  totalSessions: number;
  completedSessions: number;
  nextSession?: string;
  image: string;
}

interface WorkoutSession {
  id: number;
  name: string;
  exercises: string[];
  duration: number;
  completed: boolean;
  date: string;
}

export const Training = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'programs' | 'sessions' | 'progress'>('programs');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [todaySessions, setTodaySessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockPrograms: TrainingProgram[] = [
      {
        id: 1,
        name: 'Elite QB Development',
        description: 'Comprehensive quarterback training program focusing on accuracy, decision-making, and leadership.',
        duration: '12 weeks',
        level: 'Advanced',
        category: 'Position Specific',
        progress: 75,
        totalSessions: 36,
        completedSessions: 27,
        nextSession: 'Tomorrow',
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 2,
        name: 'Speed & Agility Mastery',
        description: 'Advanced training for explosive speed, quick directional changes, and footwork.',
        duration: '8 weeks',
        level: 'Elite',
        category: 'Athletic Development',
        progress: 60,
        totalSessions: 24,
        completedSessions: 14,
        nextSession: 'Today',
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 3,
        name: 'Strength Foundation',
        description: 'Build a solid strength base with compound movements and progressive overload.',
        duration: '10 weeks',
        level: 'Intermediate',
        category: 'Strength Training',
        progress: 40,
        totalSessions: 30,
        completedSessions: 12,
        image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 4,
        name: 'Football Fundamentals',
        description: 'Master the basics of football technique, strategy, and team play.',
        duration: '6 weeks',
        level: 'Beginner',
        category: 'Fundamentals',
        progress: 90,
        totalSessions: 18,
        completedSessions: 16,
        image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&q=80&w=400'
      }
    ];

    const mockSessions: WorkoutSession[] = [
      {
        id: 1,
        name: 'QB Footwork & Accuracy',
        exercises: ['Drop back drills', 'Target practice', 'Decision training'],
        duration: 90,
        completed: false,
        date: 'Today'
      },
      {
        id: 2,
        name: 'Speed Training',
        exercises: ['40-yard dashes', 'Agility ladder', 'Hill sprints'],
        duration: 60,
        completed: false,
        date: 'Today'
      },
      {
        id: 3,
        name: 'Strength Session',
        exercises: ['Squats', 'Bench press', 'Deadlifts'],
        duration: 75,
        completed: true,
        date: 'Yesterday'
      }
    ];

    setPrograms(mockPrograms);
    setTodaySessions(mockSessions);
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'text-green-500';
      case 'Intermediate': return 'text-yellow-500';
      case 'Advanced': return 'text-orange-500';
      case 'Elite': return 'text-red-500';
      default: return 'text-dark-400';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-accent';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Training Center
        </h1>
        <p className="text-dark-300 text-lg">
          Personalized training programs designed for female athletes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { id: 'programs', label: 'Programs', icon: Dumbbell },
          { id: 'sessions', label: 'Today\'s Sessions', icon: Calendar },
          { id: 'progress', label: 'Progress', icon: TrendingUp }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white'
                : 'text-dark-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((program) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 group cursor-pointer hover:scale-105 transition-all"
              onClick={() => navigate(`/training/program/${program.id}`)}
            >
              <div className="relative mb-4">
                <img
                  src={program.image}
                  alt={program.name}
                  className="w-full h-48 object-cover rounded-xl"
                />
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-dark-900/80 ${getLevelColor(program.level)}`}>
                    {program.level}
                  </span>
                </div>
                {program.nextSession && (
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-accent text-white">
                      Next: {program.nextSession}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">
                    {program.name}
                  </h3>
                  <p className="text-dark-300 text-sm">{program.description}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">{program.category}</span>
                  <span className="text-dark-400">{program.duration}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Progress</span>
                    <span className="text-white font-bold">{program.progress}%</span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(program.progress)}`}
                      style={{ width: `${program.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-dark-500">
                    {program.completedSessions} of {program.totalSessions} sessions completed
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Today's Workouts</h2>
            <div className="flex items-center gap-2 text-accent">
              <Flame size={20} />
              <span className="font-bold">3 Sessions</span>
            </div>
          </div>

          {todaySessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    session.completed ? 'bg-accent' : 'bg-brand-500'
                  }`}>
                    {session.completed ? (
                      <CheckCircle className="text-white" size={24} />
                    ) : (
                      <Play className="text-white" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{session.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-dark-400">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {session.duration} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity size={14} />
                        {session.exercises.length} exercises
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-dark-400 mb-2">{session.date}</div>
                  {!session.completed && (
                    <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold uppercase tracking-widest transition-colors">
                      Start Workout
                    </button>
                  )}
                </div>
              </div>

              {!session.completed && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {session.exercises.map((exercise, idx) => (
                      <span key={idx} className="px-3 py-1 bg-dark-800 rounded-full text-xs text-dark-300">
                        {exercise}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Stats */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Weekly Stats</h3>
            <div className="space-y-4">
              {[
                { label: 'Workouts Completed', value: '5/7', icon: CheckCircle, color: 'text-accent' },
                { label: 'Total Training Time', value: '8.5 hrs', icon: Timer, color: 'text-blue-500' },
                { label: 'Personal Records', value: '3', icon: Award, color: 'text-yellow-500' },
                { label: 'Consistency Streak', value: '12 days', icon: Flame, color: 'text-red-500' }
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <stat.icon className={stat.color} size={20} />
                    <span className="text-dark-300">{stat.label}</span>
                  </div>
                  <span className="text-white font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Performance Trends</h3>
            <div className="h-64 flex items-center justify-center bg-dark-800/50 rounded-xl">
              <div className="text-center">
                <TrendingUp className="mx-auto text-brand-500 mb-4" size={48} />
                <p className="text-dark-400">Performance chart coming soon</p>
                <p className="text-sm text-dark-500 mt-2">Track your improvement over time</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
