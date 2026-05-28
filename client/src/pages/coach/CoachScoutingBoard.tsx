import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, Trash2, Star, Users, MapPin, GraduationCap, Award } from 'lucide-react';
import type { ScoutingBoardItem, PlayerSearchResult } from '../../types';

const TIERS = [
  { id: 'top-target', label: 'Top Targets', color: 'bg-red-600', description: 'Priority recruits' },
  { id: 'watching', label: 'Watching', color: 'bg-yellow-600', description: 'Prospects to monitor' },
  { id: 'offered', label: 'Offered', color: 'bg-green-600', description: 'Players with offers' },
];

export function CoachScoutingBoard() {
  const [board, setBoard] = useState<ScoutingBoardItem[]>([]);
  const [players, setPlayers] = useState<Map<number, PlayerSearchResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState<string>('all');
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    fetchScoutingBoard();
  }, []);

  const fetchScoutingBoard = async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/coach/board', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBoard(data.board || []);

        // Fetch player details for each board item
        const playerPromises = data.board.map(async (item: ScoutingBoardItem) => {
          try {
            const playerResponse = await fetch(`/coach/players/${item.playerId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (playerResponse.ok) {
              const playerData = await playerResponse.json();
              return { id: item.playerId, data: playerData };
            }
          } catch (error) {
            console.error(`Failed to fetch player ${item.playerId}:`, error);
          }
          return null;
        });

        const playerResults = await Promise.all(playerPromises);
        const playerMap = new Map<number, PlayerSearchResult>();
        playerResults.forEach(result => {
          if (result) {
            // Convert full profile to search result format
            const player: PlayerSearchResult = {
              id: result.data.id,
              name: result.data.name,
              position: result.data.position,
              state: result.data.state,
              city: result.data.city,
              school: result.data.school,
              gradYear: result.data.gradYear,
              height: result.data.height,
              weight: result.data.weight,
              gpa: result.data.gpa,
              breakoutScore: result.data.breakoutScore,
              stars: result.data.stars,
              archetype: result.data.archetype,
              stats: result.data.stats,
              combineStats: result.data.combineStats,
              highlights: result.data.highlights?.length || 0,
              verified: result.data.verified || false,
              offers: result.data.offers?.length || 0,
              committed: result.data.committed || false,
              nilPoints: result.data.nilPoints,
            };
            playerMap.set(result.id, player);
          }
        });
        setPlayers(playerMap);
      }
    } catch (error) {
      console.error('Failed to fetch scouting board:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromBoard = async (playerId: number) => {
    try {
      const token = localStorage.getItem('coachToken');
      await fetch(`/coach/players/${playerId}/save`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setBoard(prev => prev.filter(item => item.playerId !== playerId));
    } catch (error) {
      console.error('Failed to remove player from board:', error);
    }
  };

  const updateTier = async (playerId: number, newTier: string) => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/coach/players/${playerId}/tier`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (response.ok) {
        setBoard(prev => prev.map(item =>
          item.playerId === playerId ? { ...item, tier: newTier as any } : item
        ));
      }
    } catch (error) {
      console.error('Failed to update tier:', error);
    }
  };

  const updateNotes = async (playerId: number, notes: string) => {
    try {
      const token = localStorage.getItem('coachToken');
      await fetch(`/coach/players/${playerId}/notes`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      setBoard(prev => prev.map(item =>
        item.playerId === playerId ? { ...item, notes } : item
      ));
      setEditingNotes(null);
      setNotesText('');
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const startEditingNotes = (playerId: number, currentNotes: string) => {
    setEditingNotes(playerId);
    setNotesText(currentNotes || '');
  };

  const filteredBoard = activeTier === 'all'
    ? board
    : board.filter(item => item.tier === activeTier);

  const getTierStats = (tierId: string) => {
    return board.filter(item => item.tier === tierId).length;
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
              <h1 className="text-3xl font-bold text-white">Scouting Board</h1>
              <p className="text-gray-400 mt-2">Manage your recruiting pipeline</p>
            </div>
            <Link
              to="/coach/search"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Find More Players
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tier Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setActiveTier('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTier === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Players ({board.length})
            </button>
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setActiveTier(tier.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTier === tier.id
                    ? `${tier.color} text-white`
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tier.label} ({getTierStats(tier.id)})
              </button>
            ))}
          </div>

          {/* Tier Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <div key={tier.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${tier.color}`}></div>
                  <h3 className="text-lg font-semibold text-white">{tier.label}</h3>
                </div>
                <p className="text-gray-400 text-sm">{tier.description}</p>
                <p className="text-white font-medium mt-2">{getTierStats(tier.id)} players</p>
              </div>
            ))}
          </div>
        </div>

        {/* Board Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredBoard.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">
              {activeTier === 'all' ? 'Your scouting board is empty' : `No players in ${TIERS.find(t => t.id === activeTier)?.label}`}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTier === 'all'
                ? 'Start by searching for players and adding them to your board'
                : 'Try changing the filter or adding players to this tier'
              }
            </p>
            <Link
              to="/coach/search"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Search Players
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoard.map((item) => {
              const player = players.get(item.playerId);
              if (!player) return null;

              const tierInfo = TIERS.find(t => t.id === item.tier);

              return (
                <div key={item.playerId} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-white">{player.name}</h3>
                          {player.verified && (
                            <Award className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
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
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${tierInfo?.color} text-white`}>
                          <div className={`w-2 h-2 rounded-full bg-white`}></div>
                          {tierInfo?.label}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromBoard(item.playerId)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
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

                    {/* Tier Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Change Tier</label>
                      <select
                        value={item.tier}
                        onChange={(e) => updateTier(item.playerId, e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      >
                        {TIERS.map((tier) => (
                          <option key={tier.id} value={tier.id}>{tier.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                      {editingNotes === item.playerId ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm h-20 resize-none"
                            placeholder="Add notes about this player..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateNotes(item.playerId, notesText)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingNotes(item.playerId, item.notes || '')}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm min-h-[2.5rem] cursor-pointer hover:bg-gray-600 transition-colors"
                        >
                          {item.notes ? (
                            <span className="text-gray-300">{item.notes}</span>
                          ) : (
                            <span className="text-gray-500 italic">Click to add notes...</span>
                          )}
                        </div>
                      )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}