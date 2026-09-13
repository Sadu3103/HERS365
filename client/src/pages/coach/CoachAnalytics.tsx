import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Eye,
  MessageSquare,
  MapPin,
  Target,
  Award,
  Heart,
} from 'lucide-react';

type CoachAnalyticsResponse = {
  boardCount: number;
  messagesSent: number;
  playersContacted: number;
  topStates: string[];
  totalPlayersViewed: number;
  searchQueriesThisWeek: number;
  profileViewsThisWeek: number;
  avgSessionTime: number | null;
  boardConversionRate: number;
  recruitingPipeline: {
    prospects: number;
    contacted: number;
    offered: number;
    committed: number;
  };
  weeklyActivity: { day: string; searches: number; views: number; saves: number }[];
  positionBreakdown: { position: string; count: number; percentage: number }[];
};

async function fetchCoachAnalytics(): Promise<CoachAnalyticsResponse> {
  const token = localStorage.getItem('coachToken');
  const res = await fetch('/api/coach/analytics', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to load analytics (${res.status})`);
  }
  return res.json();
}

export function CoachAnalytics() {
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery<CoachAnalyticsResponse>({
    queryKey: ['coach', 'analytics'],
    queryFn: fetchCoachAnalytics,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="h-8 w-64 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-80 bg-gray-700 rounded mt-3 animate-pulse" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-700 rounded mt-3 animate-pulse" />
                <div className="h-3 w-32 bg-gray-700 rounded mt-3 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Could not load analytics data.</p>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasAnyActivity =
    analytics.boardCount > 0 ||
    analytics.messagesSent > 0 ||
    analytics.totalPlayersViewed > 0 ||
    analytics.searchQueriesThisWeek > 0;

  const topRecruitingStates = analytics.topStates.map(state => ({
    state,
    players: 0,
    percentage: 0,
  }));

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
        {!hasAnyActivity && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 text-center">
            <p className="text-gray-300 font-medium">No recruiting activity yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Start searching for players and saving prospects to your board to see analytics here.
            </p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Board Size</p>
                <p className="text-2xl font-bold text-white">{analytics.boardCount}</p>
                <p className="text-xs text-gray-500 mt-1">prospects on your board</p>
              </div>
              <Heart className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Players Viewed</p>
                <p className="text-2xl font-bold text-white">{analytics.totalPlayersViewed}</p>
                <p className="text-xs text-gray-500 mt-1">profile views</p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Messages Sent</p>
                <p className="text-2xl font-bold text-white">{analytics.messagesSent}</p>
                <p className="text-xs text-gray-500 mt-1">messages sent total</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{analytics.boardConversionRate}%</p>
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
                <span className="text-xl font-bold text-white">{analytics.recruitingPipeline.prospects}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <span className="text-white">Contacted</span>
                </div>
                <span className="text-xl font-bold text-white">{analytics.recruitingPipeline.contacted}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">Offered</span>
                </div>
                <span className="text-xl font-bold text-white">{analytics.recruitingPipeline.offered}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-white">Committed</span>
                </div>
                <span className="text-xl font-bold text-white">{analytics.recruitingPipeline.committed}</span>
              </div>
            </div>
          </div>

          {/* Top Recruiting States */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Top Recruiting States</h3>
            {topRecruitingStates.length === 0 ? (
              <p className="text-gray-500 text-sm">No state data yet.</p>
            ) : (
              <div className="space-y-3">
                {topRecruitingStates.map((state, index) => (
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
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Activity */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Weekly Activity</h3>
            {analytics.weeklyActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No weekly activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.weeklyActivity.map((day) => (
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
            )}
          </div>

          {/* Position Breakdown */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Board Position Breakdown</h3>
            {analytics.positionBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm">No board positions saved yet.</p>
            ) : (
              <div className="space-y-4">
                {analytics.positionBreakdown.map((pos) => (
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
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
