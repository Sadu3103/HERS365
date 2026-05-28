
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Search,
  Star,
  Target,
  Zap
} from 'lucide-react';

interface PlayerRanking {
  id: number;
  name: string;
  school: string;
  position: string;
  rating: number;
  change: number;
  stats: {
    speed: number;
    strength: number;
    agility: number;
    technique: number;
  };
  avatar?: string;
}

export const Rankings = () => {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [filterPosition, setFilterPosition] = useState<string>('All');
  const [filterSchool, setFilterSchool] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('rating');

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockRankings: PlayerRanking[] = [
      {
        id: 1,
        name: 'Sarah Johnson',
        school: 'Lincoln High',
        position: 'QB',
        rating: 98.5,
        change: 2.1,
        stats: { speed: 95, strength: 88, agility: 92, technique: 97 },
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
      },
      {
        id: 2,
        name: 'Emma Davis',
        school: 'Washington Prep',
        position: 'WR',
        rating: 97.8,
        change: -0.5,
        stats: { speed: 98, strength: 85, agility: 96, technique: 94 },
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
      },
      {
        id: 3,
        name: 'Olivia Brown',
        school: 'Jefferson Academy',
        position: 'RB',
        rating: 97.2,
        change: 1.8,
        stats: { speed: 97, strength: 90, agility: 95, technique: 92 },
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia'
      },
      {
        id: 4,
        name: 'Ava Wilson',
        school: 'Roosevelt High',
        position: 'QB',
        rating: 96.9,
        change: 0,
        stats: { speed: 93, strength: 89, agility: 91, technique: 96 },
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava'
      },
      {
        id: 5,
        name: 'Sophia Miller',
        school: 'Adams College Prep',
        position: 'WR',
        rating: 96.5,
        change: 3.2,
        stats: { speed: 96, strength: 84, agility: 94, technique: 93 },
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia'
      }
    ];
    setRankings(mockRankings);
  }, []);

  const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K'];
  const schools = ['All', ...Array.from(new Set(rankings.map(r => r.school)))];

  const filteredRankings = rankings
    .filter(player =>
      (filterPosition === 'All' || player.position === filterPosition) &&
      (filterSchool === 'All' || player.school === filterSchool) &&
      (searchQuery === '' || player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       player.school.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-400" size={24} />;
    if (rank === 3) return <Award className="text-amber-600" size={24} />;
    return <span className="text-2xl font-black text-dark-400">#{rank}</span>;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="text-accent" size={16} />;
    if (change < 0) return <TrendingDown className="text-red-500" size={16} />;
    return <Minus className="text-dark-400" size={16} />;
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Player Rankings
        </h1>
        <p className="text-dark-300 text-lg">
          Real-time rankings of top female high school athletes across the nation
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Position Filter */}
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
          >
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos === 'All' ? 'All Positions' : pos}</option>
            ))}
          </select>

          {/* School Filter */}
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
          >
            {schools.map(school => (
              <option key={school} value={school}>{school === 'All' ? 'All Schools' : school}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="rating">Sort by Rating</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="space-y-4">
        {filteredRankings.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12">
                  {getRankIcon(index + 1)}
                </div>

                {/* Player Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent p-0.5">
                    <div className="w-full h-full rounded-[14px] bg-dark-800 overflow-hidden">
                      <img src={player.avatar} alt={player.name} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">
                      {player.name}
                    </h3>
                    <p className="text-sm text-dark-400">{player.school} • {player.position}</p>
                  </div>
                </div>
              </div>

              {/* Rating & Change */}
              <div className="flex items-center gap-6">
                {/* Stats Overview */}
                <div className="hidden md:flex gap-4">
                  <div className="text-center">
                    <div className="text-xs text-dark-500 uppercase tracking-widest">Speed</div>
                    <div className="text-sm font-bold text-white">{player.stats.speed}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-dark-500 uppercase tracking-widest">Strength</div>
                    <div className="text-sm font-bold text-white">{player.stats.strength}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-dark-500 uppercase tracking-widest">Agility</div>
                    <div className="text-sm font-bold text-white">{player.stats.agility}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-dark-500 uppercase tracking-widest">Technique</div>
                    <div className="text-sm font-bold text-white">{player.stats.technique}</div>
                  </div>
                </div>

                {/* Rating */}
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="text-yellow-500 fill-current" size={16} />
                    <span className="text-2xl font-black text-white">{player.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {getChangeIcon(player.change)}
                    <span className={`font-bold ${player.change > 0 ? 'text-accent' : player.change < 0 ? 'text-red-500' : 'text-dark-400'}`}>
                      {player.change > 0 ? '+' : ''}{player.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRankings.length === 0 && (
        <div className="text-center py-16">
          <Target className="mx-auto text-dark-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No players found</h3>
          <p className="text-dark-400">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};
