
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  Calendar,
  Trophy,
  Award,
  Star,
  TrendingUp,
  Edit3,
  Settings,
  Camera,
  Mail,
  Phone,
  Globe,
  Heart,
  MessageSquare,
  Share2,
  Target,
  Activity,
  Zap
} from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  school: string;
  position: string;
  graduationYear: number;
  location: string;
  bio: string;
  avatar: string;
  coverImage: string;
  stats: {
    rating: number;
    speed: number;
    strength: number;
    agility: number;
    technique: number;
  };
  achievements: string[];
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
  joinDate: string;
  lastActive: string;
}

interface ActivityItem {
  id: number;
  type: 'post' | 'achievement' | 'workout' | 'game';
  title: string;
  description: string;
  date: string;
  image?: string;
}

export const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'achievements' | 'activity'>('overview');

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockProfile: UserProfile = {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      school: 'Lincoln High School',
      position: 'Quarterback',
      graduationYear: 2026,
      location: 'Los Angeles, CA',
      bio: 'Passionate quarterback with a love for the game and academics. Leading my team to victory while maintaining straight A\'s. Future college athlete with big dreams!',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      coverImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200',
      stats: {
        rating: 98.5,
        speed: 95,
        strength: 88,
        agility: 92,
        technique: 97
      },
      achievements: [
        'State Champion 2024',
        'Team Captain',
        'Academic All-Star',
        'Leadership Award',
        'Perfect Attendance 2023-2024'
      ],
      followers: 1247,
      following: 89,
      posts: 56,
      isVerified: true,
      joinDate: 'January 2023',
      lastActive: '2 hours ago'
    };

    const mockActivities: ActivityItem[] = [
      {
        id: 1,
        type: 'achievement',
        title: 'New Personal Record',
        description: '40-yard dash: 4.8 seconds - new PR!',
        date: '2 hours ago',
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 2,
        type: 'post',
        title: 'Game Day Motivation',
        description: 'Posted a new highlight reel from Friday\'s game',
        date: '1 day ago'
      },
      {
        id: 3,
        type: 'workout',
        title: 'Training Session Complete',
        description: 'Completed QB fundamentals training - 2 hours',
        date: '2 days ago'
      },
      {
        id: 4,
        type: 'achievement',
        title: 'Team Victory',
        description: 'Led team to 45-12 victory over rivals',
        date: '3 days ago'
      }
    ];

    setProfile(mockProfile);
    setActivities(mockActivities);
  }, []);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Trophy className="text-yellow-500" size={20} />;
      case 'post': return <MessageSquare className="text-blue-500" size={20} />;
      case 'workout': return <Activity className="text-green-500" size={20} />;
      case 'game': return <Target className="text-red-500" size={20} />;
      default: return <Star className="text-gray-500" size={20} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Cover Image */}
      <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
        <img
          src={profile.coverImage}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent" />

        {/* Edit Cover Button */}
        <button className="absolute top-4 right-4 p-2 bg-dark-900/50 hover:bg-dark-900/70 text-white rounded-lg transition-colors">
          <Camera size={20} />
        </button>

        {/* Profile Info Overlay */}
        <div className="absolute bottom-6 left-6 flex items-end gap-4">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-brand-500 to-accent p-1">
              <div className="w-full h-full rounded-[14px] bg-dark-800 overflow-hidden">
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <button className="absolute bottom-0 right-0 p-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors">
              <Camera size={14} />
            </button>
          </div>

          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                {profile.name}
              </h1>
              {profile.isVerified && (
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <Award size={14} className="text-white" />
                </div>
              )}
            </div>
            <p className="text-dark-300 text-sm md:text-base">{profile.position} • {profile.school}</p>
            <p className="text-dark-400 text-sm">Class of {profile.graduationYear}</p>
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white mb-1">{profile.followers.toLocaleString()}</div>
          <div className="text-xs text-dark-400 uppercase tracking-widest">Followers</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white mb-1">{profile.following}</div>
          <div className="text-xs text-dark-400 uppercase tracking-widest">Following</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white mb-1">{profile.posts}</div>
          <div className="text-xs text-dark-400 uppercase tracking-widest">Posts</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="text-yellow-500 fill-current" size={20} />
            <span className="text-2xl font-black text-white">{profile.stats.rating}</span>
          </div>
          <div className="text-xs text-dark-400 uppercase tracking-widest">Rating</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'stats', label: 'Statistics', icon: TrendingUp },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'activity', label: 'Activity', icon: Activity }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
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

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bio and Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">About</h3>
                <p className="text-dark-300 leading-relaxed mb-6">{profile.bio}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-dark-400">
                    <MapPin size={18} />
                    <span>{profile.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-dark-400">
                    <Mail size={18} />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-dark-400">
                    <Calendar size={18} />
                    <span>Joined {profile.joinDate}</span>
                  </div>
                  <div className="flex items-center gap-3 text-dark-400">
                    <Activity size={18} />
                    <span>Active {profile.lastActive}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">Quick Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Speed', value: profile.stats.speed, icon: Zap },
                    { label: 'Strength', value: profile.stats.strength, icon: Award },
                    { label: 'Agility', value: profile.stats.agility, icon: Target },
                    { label: 'Technique', value: profile.stats.technique, icon: Star }
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <stat.icon className="mx-auto text-brand-500 mb-2" size={24} />
                      <div className="text-2xl font-black text-white">{stat.value}</div>
                      <div className="text-xs text-dark-400 uppercase tracking-widest">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-4">
              <button className="w-full flex items-center justify-center gap-2 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
                <Edit3 size={18} />
                Edit Profile
              </button>

              <button className="w-full flex items-center justify-center gap-2 py-4 glass-premium hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
                <Share2 size={18} />
                Share Profile
              </button>

              <button className="w-full flex items-center justify-center gap-2 py-4 glass-premium hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
                <Settings size={18} />
                Settings
              </button>

              <div className="glass-card p-4">
                <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-widest">Profile Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">Profile Completion</span>
                    <span className="text-accent font-bold">95%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">Scout Views</span>
                    <span className="text-white font-bold">247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">Messages</span>
                    <span className="text-white font-bold">12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Detailed Stats */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Performance Metrics</h3>
              <div className="space-y-4">
                {[
                  { name: '40-Yard Dash', value: '4.8s', trend: '+0.2s', positive: false },
                  { name: 'Bench Press', value: '185 lbs', trend: '+15 lbs', positive: true },
                  { name: 'Vertical Jump', value: '28"', trend: '+2"', positive: true },
                  { name: 'Broad Jump', value: '9\'2"', trend: '+4"', positive: true },
                  { name: '3-Cone Drill', value: '7.2s', trend: '-0.3s', positive: true },
                  { name: 'Shuttle Run', value: '4.4s', trend: '-0.1s', positive: true }
                ].map((stat) => (
                  <div key={stat.name} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                    <span className="text-dark-300">{stat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{stat.value}</span>
                      <span className={`text-xs ${stat.positive ? 'text-accent' : 'text-red-500'}`}>
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Chart Placeholder */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Progress Over Time</h3>
              <div className="h-64 flex items-center justify-center bg-dark-800/50 rounded-xl">
                <div className="text-center">
                  <TrendingUp className="mx-auto text-brand-500 mb-4" size={48} />
                  <p className="text-dark-400">Progress chart coming soon</p>
                  <p className="text-sm text-dark-500 mt-2">Track your improvement across all metrics</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-white" size={32} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{achievement}</h4>
                <p className="text-sm text-dark-400">Achievement Unlocked</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-1">{activity.title}</h4>
                    <p className="text-dark-300 mb-2">{activity.description}</p>
                    <p className="text-xs text-dark-500">{activity.date}</p>
                  </div>
                  {activity.image && (
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
