import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Star, MapPin, GraduationCap, Award, Users, Heart } from 'lucide-react';
import type { PlayerSearchResult } from '../../types';

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

const POSITIONS = [
  'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ATH'
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const GRAD_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

export function CoachPlayerSearch() {
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [savedPlayers, setSavedPlayers] = useState<Set<number>>(new Set());

  useEffect(() => {
    searchPlayers();
  }, [filters]);

  const searchPlayers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.set(key, value.toString());
        }
      });
      queryParams.set('limit', '50');

      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/coach/players/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSavePlayer = async (playerId: number) => {
    const token = localStorage.getItem('coachToken');
    const isSaved = savedPlayers.has(playerId);

    try {
      if (isSaved) {
        await fetch(`/coach/players/${playerId}/save`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setSavedPlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
      } else {
        await fetch(`/coach/players/${playerId}/save`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier: 'watching' }),
        });
        setSavedPlayers(prev => new Set(prev).add(playerId));
      }
    } catch (error) {
      console.error('Failed to save player:', error);
    }
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Player Search</h1>
              <p className="text-gray-400 mt-2">Discover and recruit top talent</p>
            </div>
            <Link
              to="/coach/board"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Scouting Board
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players by name, school, or location..."
                value={filters.q || ''}
                onChange={(e) => updateFilter('q', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                <select
                  value={filters.position || ''}
                  onChange={(e) => updateFilter('position', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="">All Positions</option>
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                <select
                  value={filters.state || ''}
                  onChange={(e) => updateFilter('state', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="">All States</option>
                  {STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Grad Year</label>
                <select
                  value={filters.gradYear || ''}
                  onChange={(e) => updateFilter('gradYear', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="">All Years</option>
                  {GRAD_YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Archetype</label>
                <select
                  value={filters.archetype || ''}
                  onChange={(e) => updateFilter('archetype', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Breakout Score Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minBreakoutScore || ''}
                    onChange={(e) => updateFilter('minBreakoutScore', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.maxBreakoutScore || ''}
                    onChange={(e) => updateFilter('maxBreakoutScore', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">GPA Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    value={filters.minGpa || ''}
                    onChange={(e) => updateFilter('minGpa', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    value={filters.maxGpa || ''}
                    onChange={(e) => updateFilter('maxGpa', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Height Range (inches)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="60"
                    max="84"
                    value={filters.minHeight || ''}
                    onChange={(e) => updateFilter('minHeight', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="60"
                    max="84"
                    value={filters.maxHeight || ''}
                    onChange={(e) => updateFilter('maxHeight', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Weight Range (lbs)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="100"
                    max="400"
                    value={filters.minWeight || ''}
                    onChange={(e) => updateFilter('minWeight', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="100"
                    max="400"
                    value={filters.maxWeight || ''}
                    onChange={(e) => updateFilter('maxWeight', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Verified Only</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.verified || false}
                      onChange={(e) => updateFilter('verified', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-300">Verified players only</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-400">
              {loading ? 'Searching...' : `${players.length} players found`}
            </p>
          </div>
        </div>

        {/* Player Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <div key={player.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-white">{player.name}</h3>
                      {player.verified && (
                        <Award className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {player.position}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {player.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        {player.gradYear}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSavePlayer(player.id)}
                    className={`p-2 rounded-full transition-colors ${
                      savedPlayers.has(player.id)
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${savedPlayers.has(player.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Breakout Score</span>
                    <span className="text-lg font-semibold text-green-400">{player.breakoutScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Rating</span>
                    <div className="flex items-center gap-1">
                      {renderStars(player.stars)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">NIL Points</span>
                    <span className="text-lg font-semibold text-yellow-400">{player.nilPoints.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    to={`/coach/player/${player.id}`}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Profile
                  </Link>
                  <div className="text-sm text-gray-400">
                    {player.offers} offers • {player.highlights} highlights
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {players.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No players found</h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
          </div>
        )}
      </div>
    </div>
  );
}