import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  MessageSquare,
  BarChart3,
  Heart,
  Eye,
  TrendingUp,
  MapPin,
  Star,
  ChevronRight,
  X,
} from 'lucide-react';
import type { CoachAnalytics as CoachAnalyticsType, PlayerClip } from '../../types';

export function CoachDashboard() {
  const [analytics, setAnalytics] = useState<CoachAnalyticsType | null>(null);
  const [clips, setClips] = useState<PlayerClip[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchPosition, setSearchPosition] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerClip[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchClips();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() || searchPosition || searchState) {
        performSearch();
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPosition, searchState]);

  const performSearch = useCallback(async () => {
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const token = localStorage.getItem('coachToken');
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        position: searchPosition,
        state: searchState,
      });
      const response = await fetch(`/coach/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.players || data.clips || data || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchPosition, searchState]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/coach/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchClips = async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/coach/player-clips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClips(data.clips || []);
      }
    } catch (error) {
      console.error('Failed to fetch clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchPosition('');
    setSearchState('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const quickActions = [
    { title: 'Player Search', description: 'Find and discover new talent', icon: Search, path: '/coach/search', color: 'bg-blue-600 hover:bg-blue-700' },
    { title: 'Scouting Board', description: 'Manage your watchlist', icon: Heart, path: '/coach/board', color: 'bg-red-600 hover:bg-red-700' },
    { title: 'Messages', description: 'Contact athletes and parents', icon: MessageSquare, path: '/coach/messages', color: 'bg-green-600 hover:bg-green-700' },
    { title: 'Analytics', description: 'View recruiting insights', icon: BarChart3, path: '/coach/analytics', color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  const positions = ['QB', 'WR', 'RB', 'DB', 'LB', 'DL', 'OL', 'ATH'];
  const states = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
    'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
    'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
  ];

  const isSearchActive = hasSearched && (searchQuery.trim() || searchPosition || searchState);
  const displayPlayers = isSearchActive ? searchResults : clips;
  const noResults = isSearchActive && !searchLoading && displayPlayers.length === 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Coach Dashboard</h1>
          <p className="text-gray-400 mt-2">Welcome back! Here's your recruiting overview.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-400">Board Size</p><p className="text-2xl font-bold text-white">{analytics?.boardCount || 0}</p></div>
              <Heart className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-400">Messages Sent</p><p className="text-2xl font-bold text-white">{analytics?.messagesSent || 0}</p></div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-400">Profile Views</p><p className="text-2xl font-bold text-white">{analytics?.profileViews || 0}</p></div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-400">Top State</p><p className="text-2xl font-bold text-white">{analytics?.topStates?.[0] || 'N/A'}</p></div>
              <MapPin className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-400 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players by name, school..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-gray-400 mb-1">Position</label>
              <select value={searchPosition} onChange={(e) => setSearchPosition(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-gray-400 mb-1">State</label>
              <select value={searchState} onChange={(e) => setSearchState(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {searchLoading && (
            <div className="flex items-center gap-2 mt-3 text-sm text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              Searching...
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.path} className={`${action.color} p-6 rounded-lg transition-colors group`}>
                <div className="flex items-center justify-between mb-3">
                  <action.icon className="w-8 h-8 text-white" />
                  <ChevronRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
                <p className="text-white/80 text-sm">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {analytics?.recentlyViewed?.slice(0, 5).map((playerId) => (
                <div key={playerId} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Viewed Player #{playerId}</p>
                      <p className="text-gray-400 text-sm">2 hours ago</p>
                    </div>
                  </div>
                  <Link to={`/coach/player/${playerId}`} className="text-blue-400 hover:text-blue-300 text-sm">View</Link>
                </div>
              )) || <p className="text-gray-400 text-center py-4">No recent activity</p>}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{isSearchActive ? 'Search Results' : 'Trending Players'}</h3>
            <div className="space-y-4">
              {displayPlayers.slice(0, 5).map((clip) => (
                <div key={clip.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                  <img src={clip.thumbnailUrl} alt={clip.title} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{clip.name}</h4>
                    <p className="text-gray-400 text-sm">{clip.position} • {clip.school}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < clip.stars ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} />)}
                      </div>
                      <span className="text-gray-400 text-xs">• {clip.breakoutScore} BR</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{clip.views.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs">views</p>
                  </div>
                </div>
              ))}
              {noResults && (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 font-medium">No players found</p>
                  <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{isSearchActive ? 'Search Results' : 'Player Highlights'}</h2>
            <Link to="/coach/search" className="text-blue-400 hover:text-blue-300 text-sm font-medium">View All Players →</Link>
          </div>

          {loading || searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : noResults ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium text-lg">No players found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
              <button onClick={clearSearch} className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium">Clear search</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPlayers.slice(0, 6).map((clip) => (
                <div key={clip.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
                  <div className="aspect-video bg-gray-700 relative">
                    <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-medium">{clip.name}</p>
                        <p className="text-xs opacity-80">{clip.position} • {clip.school}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-2 line-clamp-2">{clip.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{clip.views.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{clip.likes.toLocaleString()}</span>
                      </div>
                      <span className="text-xs">{clip.breakoutScore} BR</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Link to={`/coach/player/${clip.playerId}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">View Profile</Link>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < clip.stars ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} />)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
