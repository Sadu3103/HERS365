
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Star,
  Heart,
  Target,
  Users,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Athlete {
  id: number;
  name: string;
  school: string;
  position: string;
  rating: number;
  score: number;
  location: string;
  graduationYear: number;
  height: string;
  weight: number;
  fortyYardTime: number;
  gpa: number;
  verified: boolean;
  isFavorited: boolean;
  avatar: string;
  lastActive: string;
}

interface SearchFilters {
  position: string;
  location: string;
  graduationYear: string;
  rating: string;
  sortBy: string;
}

export const Recruiting = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<SearchFilters>({
    position: 'All',
    location: 'All',
    graduationYear: 'All',
    rating: 'All',
    sortBy: 'rating'
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockAthletes: Athlete[] = [
      {
        id: 1,
        name: 'Sarah Watkins',
        school: 'Westlake HS, TX',
        position: 'QB',
        rating: 4.82,
        score: 95,
        location: 'Texas',
        graduationYear: 2026,
        height: '5\'9"',
        weight: 145,
        fortyYardTime: 4.82,
        gpa: 3.9,
        verified: true,
        isFavorited: false,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        lastActive: '2 hours ago'
      },
      {
        id: 2,
        name: 'Maya Johnson',
        school: "St. Mary's Academy, FL",
        position: 'WR',
        rating: 4.71,
        score: 92,
        location: 'Florida',
        graduationYear: 2026,
        height: '5\'7"',
        weight: 130,
        fortyYardTime: 4.71,
        gpa: 3.7,
        verified: true,
        isFavorited: true,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
        lastActive: '1 day ago'
      },
      {
        id: 3,
        name: 'Isabella Reyes',
        school: 'Centennial HS, CA',
        position: 'DB',
        rating: 4.68,
        score: 91,
        location: 'California',
        graduationYear: 2027,
        height: '5\'6"',
        weight: 125,
        fortyYardTime: 4.68,
        gpa: 4.0,
        verified: true,
        isFavorited: false,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Isabella',
        lastActive: '5 hours ago'
      },
      {
        id: 4,
        name: 'Chloe Zhang',
        school: 'Northwood HS, GA',
        position: 'RB',
        rating: 4.65,
        score: 90,
        location: 'Georgia',
        graduationYear: 2026,
        height: '5\'5"',
        weight: 120,
        fortyYardTime: 4.65,
        gpa: 3.8,
        verified: true,
        isFavorited: false,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe',
        lastActive: '3 days ago'
      },
      {
        id: 5,
        name: 'Emma O\'Connor',
        school: 'Summit Prep, CO',
        position: 'QB',
        rating: 4.88,
        score: 89,
        location: 'Colorado',
        graduationYear: 2027,
        height: '5\'8"',
        weight: 140,
        fortyYardTime: 4.88,
        gpa: 3.95,
        verified: false,
        isFavorited: false,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
        lastActive: '1 hour ago'
      },
      {
        id: 6,
        name: 'Ava Mitchell',
        school: 'Harrison HS, AL',
        position: 'LB',
        rating: 4.75,
        score: 89,
        location: 'Alabama',
        graduationYear: 2026,
        height: '5\'9"',
        weight: 135,
        fortyYardTime: 4.75,
        gpa: 3.6,
        verified: true,
        isFavorited: false,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava',
        lastActive: '4 hours ago'
      }
    ];
    setAthletes(mockAthletes);
  }, []);

  const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K'];
  const locations = ['All', 'California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania'];
  const graduationYears = ['All', '2025', '2026', '2027', '2028'];
  const ratingRanges = ['All', '95+', '90-94', '85-89', '80-84'];

  const filteredAthletes = athletes
    .filter(athlete => {
      const matchesSearch = searchQuery === '' ||
        athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPosition = filters.position === 'All' || athlete.position === filters.position;
      const matchesLocation = filters.location === 'All' || athlete.location === filters.location;
      const matchesYear = filters.graduationYear === 'All' || athlete.graduationYear.toString() === filters.graduationYear;

      let matchesRating = true;
      if (filters.rating !== 'All') {
        const rating = athlete.rating;
        switch (filters.rating) {
          case '95+': matchesRating = rating >= 95; break;
          case '90-94': matchesRating = rating >= 90 && rating <= 94; break;
          case '85-89': matchesRating = rating >= 85 && rating <= 89; break;
          case '80-84': matchesRating = rating >= 80 && rating <= 84; break;
        }
      }

      return matchesSearch && matchesPosition && matchesLocation && matchesYear && matchesRating;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'name': return a.name.localeCompare(b.name);
        case 'school': return a.school.localeCompare(b.school);
        case 'location': return a.location.localeCompare(b.location);
        default: return 0;
      }
    });

  const toggleFavorite = (athleteId: number) => {
    setAthletes(prev =>
      prev.map(athlete =>
        athlete.id === athleteId
          ? { ...athlete, isFavorited: !athlete.isFavorited }
          : athlete
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Athlete Recruiting
        </h1>
        <p className="text-dark-300 text-lg">
          Discover and connect with top female high school athletes
        </p>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
            <input
              type="text"
              placeholder="Search athletes, schools, or positions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${
              showFilters
                ? 'bg-brand-500 text-white'
                : 'bg-dark-800 border border-white/10 text-dark-300 hover:text-white'
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-white/5"
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <select
                value={filters.position}
                onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value }))}
                className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="All">All Positions</option>
                {positions.slice(1).map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>

              <select
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="All">All Locations</option>
                {locations.slice(1).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              <select
                value={filters.graduationYear}
                onChange={(e) => setFilters(prev => ({ ...prev, graduationYear: e.target.value }))}
                className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="All">All Years</option>
                {graduationYears.slice(1).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={filters.rating}
                onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="All">All Ratings</option>
                {ratingRanges.slice(1).map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>

              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="rating">Sort by Rating</option>
                <option value="name">Sort by Name</option>
                <option value="school">Sort by School</option>
                <option value="location">Sort by Location</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-dark-300">
          Showing {filteredAthletes.length} of {athletes.length} athletes
        </p>
        <div className="flex items-center gap-4 text-sm text-dark-400">
          <div className="flex items-center gap-1">
            <Users size={16} />
            {athletes.filter(a => a.isFavorited).length} favorited
          </div>
          <div className="flex items-center gap-1">
            <Eye size={16} />
            Active this week
          </div>
        </div>
      </div>

      {/* Athletes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAthletes.map((athlete) => (
          <motion.div
            key={athlete.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 group cursor-pointer hover:scale-105 transition-all"
            onClick={() => navigate(`/athlete/${athlete.id}`)}
          >
            {/* Header with Avatar */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent p-0.5">
                  <div className="w-full h-full rounded-[14px] bg-dark-800 overflow-hidden">
                    <img src={athlete.avatar} alt={athlete.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(athlete.id);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  athlete.isFavorited
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-dark-400 hover:text-red-500 hover:bg-red-500/10'
                }`}
              >
                <Heart size={18} className={athlete.isFavorited ? 'fill-current' : ''} />
              </button>
            </div>

            {/* Name and verification */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{athlete.name}</h3>
                {athlete.verified && <span className="text-blue-400 text-sm">✓</span>}
              </div>
              <p className="text-xs text-dark-400">{athlete.school}</p>
            </div>

            {/* Position and Class */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">{athlete.position}</span>
                <span className="text-dark-400">Class of {athlete.graduationYear}</span>
              </div>
            </div>

            {/* Stats Row: 40yd, GPA, Height */}
            <div className="flex items-center justify-between mb-4 text-xs">
              <div>
                <span className="text-dark-500">40yd</span>
                <span className="text-white font-bold ml-1">{athlete.fortyYardTime.toFixed(2)}s</span>
              </div>
              <div>
                <span className="text-dark-500">GPA</span>
                <span className="text-white font-bold ml-1">{athlete.gpa.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-dark-500">HGT</span>
                <span className="text-white font-bold ml-1">{athlete.height}</span>
              </div>
              <div className="text-blue-400 font-black text-lg">{athlete.score}</div>
            </div>

            {/* Star Rating */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < 4 ? 'text-yellow-500 fill-yellow-500' : 'text-dark-500'}
                />
              ))}
            </div>

            {/* View Profile Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${athlete.id}`);
              }}
              className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-semibold"
            >
              View Profile
            </button>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAthletes.length === 0 && (
        <div className="text-center py-16">
          <Target className="mx-auto text-dark-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No athletes found</h3>
          <p className="text-dark-400">Try adjusting your search criteria or filters</p>
        </div>
      )}
    </div>
  );
};
