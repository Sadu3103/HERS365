import { useState, useEffect } from 'react';
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
  Calendar,
  Star,
  ChevronRight
} from 'lucide-react';
import type { CoachAnalytics as CoachAnalyticsType, PlayerClip } from '../../types';

export function CoachDashboard() {
  const [analytics, setAnalytics] = useState<CoachAnalyticsType | null>(null);
  const [clips, setClips] = useState<PlayerClip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchClips();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/coach/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  const quickActions = [
    {
      title: 'Player Search',
      description: 'Find and discover new talent',
      icon: Search,
      path: '/coach/search',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Scouting Board',
      description: 'Manage your watchlist',
      icon: Heart,
      path: '/coach/board',
      color: 'bg-red-600 hover:bg-red-700',
    },
    {
      title: 'Messages',
      description: 'Contact athletes and parents',
      icon: MessageSquare,
      path: '/coach/messages',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: 'Analytics',
      description: 'View recruiting insights',
      icon: BarChart3,
      path: '/coach/analytics',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Coach Dashboard</h1>
          <p className="text-gray-400 mt-2">Welcome back! Here's your recruiting overview.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Board Size</p>
                <p className="text-2xl font-bold text-white">{analytics?.boardCount || 0}</p>
              </div>
              <Heart className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Messages Sent</p>
                <p className="text-2xl font-bold text-white">{analytics?.messagesSent || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Profile Views</p>
                <p className="text-2xl font-bold text-white">{analytics?.profileViews || 0}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Top State</p>
                <p className="text-2xl font-bold text-white">{analytics?.topStates?.[0] || 'N/A'}</p>
              </div>
              <MapPin className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.path}
                className={`${action.color} p-6 rounded-lg transition-colors group`}
              >
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
          {/* Recent Activity */}
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
                  <Link
                    to={`/coach/player/${playerId}`}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View
                  </Link>
                </div>
              )) || (
                <p className="text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Trending Players */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trending Players</h3>
            <div className="space-y-4">
              {clips.slice(0, 5).map((clip) => (
                <div key={clip.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{clip.name}</h4>
                    <p className="text-gray-400 text-sm">{clip.position} • {clip.school}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < clip.stars ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
                          />
                        ))}
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
            </div>
          </div>
        </div>

        {/* Player Highlights Feed */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Player Highlights</h2>
            <Link
              to="/coach/search"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              View All Players →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clips.slice(0, 6).map((clip) => (
                <div key={clip.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
                  <div className="aspect-video bg-gray-700 relative">
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="w-full h-full object-cover"
                    />
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
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {clip.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {clip.likes.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs">{clip.breakoutScore} BR</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Link
                        to={`/coach/player/${clip.playerId}`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View Profile
                      </Link>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < clip.stars ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
                          />
                        ))}
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