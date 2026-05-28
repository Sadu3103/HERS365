import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MessageSquare,
  MapPin,
  Calendar,
  Target,
  Award,
  Search,
  Heart,
  Activity
} from 'lucide-react';
import type { CoachAnalytics as CoachAnalyticsType } from '../../types';

export function CoachAnalytics() {
  const [analytics, setAnalytics] = useState<CoachAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
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

  const mockDetailedAnalytics = {
    totalPlayersViewed: analytics?.profileViews || 47,
    searchQueriesThisWeek: analytics?.searchQueries || 23,
    messagesSentThisMonth: analytics?.messagesSent || 12,
    boardConversionRate: 15.7,
    topRecruitingStates: [
      { state: 'TX', players: 45, percentage: 28 },
      { state: 'FL', players: 32, percentage: 20 },
      { state: 'CA', players: 28, percentage: 18 },
      { state: 'GA', players: 22, percentage: 14 },
      { state: 'AL', players: 18, percentage: 11 },
    ],
    recruitingPipeline: {
      prospects: analytics?.boardCount || 24,
      contacted: analytics?.playersContacted || 18,
      offered: analytics?.offersExtended || 5,
      committed: analytics?.commitsReceived || 2,
    },
    weeklyActivity: [
      { day: 'Mon', searches: 12, views: 8, saves: 3 },
      { day: 'Tue', searches: 15, views: 12, saves: 5 },
      { day: 'Wed', searches: 8, views: 6, saves: 2 },
      { day: 'Thu', searches: 18, views: 14, saves: 7 },
      { day: 'Fri', searches: 22, views: 16, saves: 8 },
      { day: 'Sat', searches: 25, views: 20, saves: 10 },
      { day: 'Sun', searches: 16, views: 13, saves: 6 },
    ],
    positionBreakdown: [
      { position: 'QB', count: 8, percentage: 33 },
      { position: 'RB', count: 6, percentage: 25 },
      { position: 'WR', count: 5, percentage: 21 },
      { position: 'OL', count: 3, percentage: 13 },
      { position: 'LB', count: 2, percentage: 8 },
    ],
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
                <p className="text-xs text-green-400 mt-1">+12% from last month</p>
              </div>
              <Heart className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Players Viewed</p>
                <p className="text-2xl font-bold text-white">{mockDetailedAnalytics.totalPlayersViewed}</p>
                <p className="text-xs text-blue-400 mt-1">+8% from last week</p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Messages Sent</p>
                <p className="text-2xl font-bold text-white">{mockDetailedAnalytics.messagesSentThisMonth}</p>
                <p className="text-xs text-green-400 mt-1">+25% from last month</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{mockDetailedAnalytics.boardConversionRate}%</p>
                <p className="text-xs text-yellow-400 mt-1">Board additions per 100 views</p>
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

        {/* Additional Insights */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Recruiting Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Peak Activity</span>
              </div>
              <p className="text-gray-300 text-sm">Your most active recruiting days are Friday and Saturday</p>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Conversion Opportunity</span>
              </div>
              <p className="text-gray-300 text-sm">Increase contact rate with top prospects to improve commits</p>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">Geographic Focus</span>
              </div>
              <p className="text-gray-300 text-sm">Texas and Florida represent 48% of your recruiting territory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}