import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Star,
  MapPin,
  GraduationCap,
  Award,
  Users,
  Heart,
  ClipboardList,
  Sparkles,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerSearchResult, ScoutingBoardItem } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface SearchFilters {
  q?: string;
  position?: string;
  state?: string;
  gradYear?: string;
  minBreakoutScore?: string;
  maxBreakoutScore?: string;
  minGpa?: string;
  maxGpa?: string;
  minHeight?: string;
  maxHeight?: string;
  minWeight?: string;
  maxWeight?: string;
  verified?: boolean;
  archetype?: string;
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ATH'];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const GRAD_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

const TIER_CONFIG = {
  'top-target': { label: 'Top Target', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'watching': { label: 'Watching', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'offered': { label: 'Offered', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
} as const;

export function CoachPlayerSearch() {
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [savedTiers, setSavedTiers] = useState<Map<number, 'top-target' | 'watching' | 'offered'>>(new Map());
  const [tierMenuOpen, setTierMenuOpen] = useState<number | null>(null);
  const { showNotification } = useNotifications();

  // Load current board items to sync saved status
  const loadSavedBoard = useCallback(async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch('/api/coach/board', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const map = new Map<number, 'top-target' | 'watching' | 'offered'>();
        if (Array.isArray(data.board)) {
          data.board.forEach((item: ScoutingBoardItem) => {
            map.set(item.playerId, item.tier);
          });
        }
        setSavedTiers(map);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    loadSavedBoard();
  }, [loadSavedBoard]);

  const searchPlayers = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.set(key, value.toString());
        }
      });
      queryParams.set('limit', '50');

      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/api/coach/players/search?${queryParams}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(Array.isArray(data?.players) ? data.players : []);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
      showNotification('error', 'Search Failed', 'Could not complete the search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, showNotification]);

  useEffect(() => {
    searchPlayers();
  }, [searchPlayers]);

  const savePlayerToTier = async (playerId: number, tier: 'top-target' | 'watching' | 'offered') => {
    const token = localStorage.getItem('coachToken');
    setTierMenuOpen(null);
    try {
      const res = await fetch(`/api/coach/players/${playerId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) {
        setSavedTiers(prev => new Map(prev).set(playerId, tier));
        showNotification('success', 'Prospect Saved', `Player added to ${TIER_CONFIG[tier].label}`);
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not update player status.');
    }
  };

  const removePlayerFromBoard = async (playerId: number) => {
    const token = localStorage.getItem('coachToken');
    setTierMenuOpen(null);
    try {
      const res = await fetch(`/api/coach/players/${playerId}/save`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setSavedTiers(prev => {
          const next = new Map(prev);
          next.delete(playerId);
          return next;
        });
        showNotification('info', 'Prospect Removed', 'Player removed from your scouting board.');
      }
    } catch {
      showNotification('error', 'Update Failed', 'Could not remove player.');
    }
  };

  const toggleSavePlayer = async (playerId: number) => {
    if (savedTiers.has(playerId)) {
      await removePlayerFromBoard(playerId);
    } else {
      await savePlayerToTier(playerId, 'watching');
    }
  };

  const updateFilter = (key: keyof SearchFilters, value: SearchFilters[typeof key]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== false).length;

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`}
      />
    ));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Quick Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface-card border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">Prospect Intelligence</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-display">
            Player Search
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Discover verified athletes, evaluate combine metrics, and recruit top prospects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/coach/board"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(34,197,94,0.25)] text-sm"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Scouting Board</span>
            {savedTiers.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-black/30 rounded-full text-xs font-black text-white">
                {savedTiers.size}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Search Input & Filter Pill Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-ink-muted" />
            <input
              type="text"
              placeholder="Search players by name, high school, club, or city..."
              value={filters.q || ''}
              onChange={(e) => updateFilter('q', e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-card border border-white/10 rounded-xl text-white placeholder:text-ink-muted text-sm focus:outline-none focus:border-green-500/60 transition-colors shadow-inner"
            />
            {filters.q && (
              <button
                onClick={() => updateFilter('q', '')}
                className="absolute right-4 top-3.5 text-ink-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
              showFilters || activeFilterCount > 0
                ? 'bg-green-500/10 border-green-500/40 text-green-400'
                : 'bg-surface-card border-white/10 text-white hover:bg-white/5'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-green-500 text-black text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Position Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => updateFilter('position', '')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              !filters.position
                ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'bg-surface-card border border-white/10 text-ink-muted hover:text-white'
            }`}
          >
            ALL
          </button>
          {POSITIONS.map((pos) => {
            const active = filters.position === pos;
            return (
              <button
                key={pos}
                onClick={() => updateFilter('position', active ? '' : pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  active
                    ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                    : 'bg-surface-card border border-white/10 text-ink-muted hover:text-white'
                }`}
              >
                {pos}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-card border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold uppercase tracking-wider text-white">Refine Prospect Criteria</span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-coral-500 hover:text-coral-400 font-bold transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Class / Grad Year</label>
                  <select
                    value={filters.gradYear || ''}
                    onChange={(e) => updateFilter('gradYear', e.target.value)}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                  >
                    <option value="">All Grad Years</option>
                    {GRAD_YEARS.map(year => (
                      <option key={year} value={year}>Class of {year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">State / Region</label>
                  <select
                    value={filters.state || ''}
                    onChange={(e) => updateFilter('state', e.target.value)}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                  >
                    <option value="">All 50 States</option>
                    {STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Archetype</label>
                  <select
                    value={filters.archetype || ''}
                    onChange={(e) => updateFilter('archetype', e.target.value)}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                  >
                    <option value="">All Archetypes</option>
                    <option value="Speedster">Speedster</option>
                    <option value="Dual-Threat">Dual-Threat</option>
                    <option value="Lockdown">Lockdown</option>
                    <option value="Power Back">Power Back</option>
                    <option value="Pocket Passer">Pocket Passer</option>
                    <option value="Playmaker">Playmaker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Minimum GPA</label>
                  <select
                    value={filters.minGpa || ''}
                    onChange={(e) => updateFilter('minGpa', e.target.value)}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                  >
                    <option value="">Any GPA</option>
                    <option value="3.0">3.0+ GPA</option>
                    <option value="3.5">3.5+ GPA</option>
                    <option value="3.8">3.8+ GPA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Breakout Score Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minBreakoutScore || ''}
                      onChange={(e) => updateFilter('minBreakoutScore', e.target.value)}
                      placeholder="Min (0)"
                      className="w-1/2 bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.maxBreakoutScore || ''}
                      onChange={(e) => updateFilter('maxBreakoutScore', e.target.value)}
                      placeholder="Max (100)"
                      className="w-1/2 bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Height Range (in)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="50"
                      max="84"
                      value={filters.minHeight || ''}
                      onChange={(e) => updateFilter('minHeight', e.target.value)}
                      placeholder="Min"
                      className="w-1/2 bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="50"
                      max="84"
                      value={filters.maxHeight || ''}
                      onChange={(e) => updateFilter('maxHeight', e.target.value)}
                      placeholder="Max"
                      className="w-1/2 bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Weight Range (lbs)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="80"
                      max="350"
                      value={filters.minWeight || ''}
                      onChange={(e) => updateFilter('minWeight', e.target.value)}
                      placeholder="Min"
                      className="w-1/2 bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="80"
                      max="350"
                      value={filters.maxWeight || ''}
                      onChange={(e) => updateFilter('maxWeight', e.target.value)}
                      placeholder="Max"
                      className="w-1/2 bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <label className="w-full flex items-center justify-between p-2.5 bg-surface-hover border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-green-400" />
                      Verified Only
                    </span>
                    <input
                      type="checkbox"
                      checked={filters.verified || false}
                      onChange={(e) => updateFilter('verified', e.target.checked)}
                      className="w-4 h-4 rounded text-green-500 focus:ring-green-500/50 bg-black/50 border-white/20"
                    />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          {loading ? 'Searching recruits...' : `${players.length} Prospect${players.length === 1 ? '' : 's'} Found`}
        </p>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-ink-muted hover:text-white transition-colors"
          >
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Player Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map((player) => {
          const currentTier = savedTiers.get(player.id);
          const isMenuOpen = tierMenuOpen === player.id;

          return (
            <div
              key={player.id}
              className="bg-surface-card border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 shadow-xl flex flex-col group"
            >
              {/* Highlight / Image Preview Strip */}
              <Link
                to={`/coach/player/${player.id}`}
                className="block aspect-[16/9] bg-surface relative overflow-hidden group/thumb"
              >
                {player.highlightThumbnailUrl || player.profileImage ? (
                  <img
                    src={player.highlightThumbnailUrl || player.profileImage || undefined}
                    alt={`${player.name} preview`}
                    className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-black text-ink-muted">
                      {player.name?.[0] ?? '?'}
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {player.highlightThumbnailUrl && (
                  <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Watch Highlights</span>
                  </div>
                )}

                {/* Archetype pill */}
                {player.archetype && (
                  <div className="absolute top-2.5 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-white border border-white/10">
                    {player.archetype}
                  </div>
                )}
              </Link>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Link
                          to={`/coach/player/${player.id}`}
                          className="text-lg font-bold text-white hover:text-green-400 transition-colors truncate block"
                        >
                          {player.name}
                        </Link>
                        {player.verified && (
                          <Award className="w-4 h-4 text-green-400 shrink-0" title="Verified Athlete" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-ink-muted">
                        <span className="flex items-center gap-1 text-white font-semibold">
                          <Users className="w-3.5 h-3.5 text-green-400" />
                          {player.position}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {player.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          '{player.gradYear}
                        </span>
                      </div>
                    </div>

                    {/* Quick Board Action / Tier Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setTierMenuOpen(isMenuOpen ? null : player.id)}
                        className={`p-2 rounded-xl border transition-all ${
                          currentTier
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-white/5 border-white/10 text-ink-muted hover:text-white hover:bg-white/10'
                        }`}
                        title={currentTier ? `Tier: ${TIER_CONFIG[currentTier].label}` : 'Add to Scouting Board'}
                      >
                        <Heart className={`w-4 h-4 ${currentTier ? 'fill-current' : ''}`} />
                      </button>

                      {/* Tier Selector Dropdown Menu */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-full mt-2 w-44 bg-surface-card/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-30 p-1.5 space-y-1"
                          >
                            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-ink-muted border-b border-white/5">
                              Assign Board Tier
                            </div>
                            <button
                              onClick={() => savePlayerToTier(player.id, 'top-target')}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                currentTier === 'top-target' ? 'bg-red-500/20 text-red-400' : 'text-white hover:bg-white/5'
                              }`}
                            >
                              <span>Top Target</span>
                              {currentTier === 'top-target' && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => savePlayerToTier(player.id, 'watching')}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                currentTier === 'watching' ? 'bg-yellow-500/20 text-yellow-400' : 'text-white hover:bg-white/5'
                              }`}
                            >
                              <span>Watching</span>
                              {currentTier === 'watching' && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => savePlayerToTier(player.id, 'offered')}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                currentTier === 'offered' ? 'bg-green-500/20 text-green-400' : 'text-white hover:bg-white/5'
                              }`}
                            >
                              <span>Offered</span>
                              {currentTier === 'offered' && <Check className="w-3.5 h-3.5" />}
                            </button>
                            {currentTier && (
                              <button
                                onClick={() => removePlayerFromBoard(player.id)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-coral-500 hover:bg-coral-500/10 border-t border-white/5 transition-colors"
                              >
                                Remove from Board
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* School / Club Subtitle */}
                  <p className="text-xs text-ink-muted mb-4 truncate">
                    {[player.school, player.city].filter(Boolean).join(' • ') || 'Independent Athlete'}
                  </p>

                  {/* Current saved status pill if saved */}
                  {currentTier && (
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${TIER_CONFIG[currentTier].badge}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        Board: {TIER_CONFIG[currentTier].label}
                      </span>
                    </div>
                  )}

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface-hover/60 border border-white/5 rounded-xl mb-4 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-muted">Breakout</div>
                      <div className="text-sm font-black text-green-400 flex items-center justify-center gap-0.5">
                        <Sparkles className="w-3 h-3 text-green-400" />
                        {player.breakoutScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-muted">Stars</div>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        {renderStars(player.stars)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-muted">NIL Pts</div>
                      <div className="text-sm font-black text-amber-400">
                        {(player.nilPoints ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <div className="text-ink-muted font-medium">
                    {player.offers || 0} Offers • {player.highlights || 0} Clips
                  </div>
                  <Link
                    to={`/coach/player/${player.id}`}
                    className="inline-flex items-center gap-1 text-green-400 hover:text-green-300 font-bold transition-colors"
                  >
                    <span>View Profile</span>
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error & Empty States */}
      {loadError && !loading && (
        <div className="p-8 text-center bg-surface-card border border-coral-500/20 rounded-2xl">
          <p className="text-sm text-coral-400 mb-3">Search request could not be completed.</p>
          <button
            onClick={searchPlayers}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs"
          >
            Retry Search
          </button>
        </div>
      )}

      {players.length === 0 && !loading && !loadError && (
        <div className="p-12 text-center bg-surface-card border border-white/10 rounded-2xl">
          <Search className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-bold text-white mb-1">No Prospects Match Your Criteria</h3>
          <p className="text-xs text-ink-muted mb-4 max-w-sm mx-auto">
            Try loosening position or breakout score filters to discover more talent.
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}