import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Eye,
  MessageSquare,
  MapPin,
  Target,
  Award,
  Heart,
} from 'lucide-react';
import type { CoachAnalytics as CoachAnalyticsType } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

export function CoachAnalytics() {
  const [analytics, setAnalytics] = useState<CoachAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { showNotification } = useNotifications();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoadError(false);
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/api/coach/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch {
      setLoadError(true);
      showNotification('error', 'Load Failed', 'Could not load analytics. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Could not load analytics data.</p>
        <button
          onClick={() => { setLoading(true); fetchAnalytics(); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const topStates: string[] = (analytics as any)?.topStates ?? [];
  const mockDetailedAnalytics = {
    totalPlayersViewed: 0,
    searchQueriesThisWeek: 0,
    messagesSentThisMonth: analytics?.messagesSent || 0,
    boardConversionRate: 0,
    topRecruitingStates: topStates.map(state => ({ state, players: 0, percentage: 0 })),
    recruitingPipeline: {
      prospects: analytics?.boardCount || 0,
      contacted: (analytics as any)?.playersContacted || 0,
      offered: 0,
      committed: 0,
    },
    weeklyActivity: [] as { day: string; searches: number; views: number; saves: number }[],
    positionBreakdown: [] as { position: string; count: number; percentage: number }[],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-gray-400 mt-2">Track your recruiting performance and insights</p>
            </div>
            <Link
              to="/coach/search"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Continue Recruiting
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Board Size</p>
                <p className="text-2xl font-bold text-white">{analytics?.boardCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">prospects on your board</p>
              </div>
              <Heart className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Players Viewed</p>
                <p className="text-2xl font-bold text-white">{mockDetailedAnalytics.totalPlayersViewed}</p>
                <p className="text-xs text-gray-500 mt-1">profile views</p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Messages Sent</p>
                <p className="text-2xl font-bold text-white">{mockDetailedAnalytics.messagesSentThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">messages sent total</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{mockDetailedAnalytics.boardConversionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">board to contact rate</p>
              </div>
              <Target className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recruiting Pipeline */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Recruiting Pipeline</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Prospects</span>
                </div>
                <span className="text-xl font-bold text-white">{mockDetailedAnalytics.recruitingPipeline.prospects}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <span className="text-white">Contacted</span>
                </div>
                <span className="text-xl font-bold text-white">{mockDetailedAnalytics.recruitingPipeline.contacted}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">Offered</span>
                </div>
                <span className="text-xl font-bold text-white">{mockDetailedAnalytics.recruitingPipeline.offered}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-white">Committed</span>
                </div>
                <span className="text-xl font-bold text-white">{mockDetailedAnalytics.recruitingPipeline.committed}</span>
              </div>
            </div>
          </div>

          {/* Top Recruiting States */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Top Recruiting States</h3>
            <div className="space-y-3">
              {mockDetailedAnalytics.topRecruitingStates.map((state, index) => (
                <div key={state.state} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-gold text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{state.state}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-semibold">{state.players}</span>
                    <span className="text-gray-400 text-sm ml-2">({state.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Activity */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Weekly Activity</h3>
            <div className="space-y-3">
              {mockDetailedAnalytics.weeklyActivity.map((day) => (
                <div key={day.day} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white font-medium w-12">{day.day}</span>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-blue-400 font-semibold">{day.searches}</div>
                      <div className="text-gray-400">searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-semibold">{day.views}</div>
                      <div className="text-gray-400">views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-semibold">{day.saves}</div>
                      <div className="text-gray-400">saves</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Position Breakdown */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Board Position Breakdown</h3>
            <div className="space-y-4">
              {mockDetailedAnalytics.positionBreakdown.map((pos) => (
                <div key={pos.position} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">{pos.position}</span>
                    <span className="text-gray-400">{pos.count} players ({pos.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${pos.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}