import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Star,
  Users,
  MapPin,
  GraduationCap,
  Award,
  Eye,
  Search,
  MessageSquare,
  Edit3,
  Check,
  X,
  Target,
  FileText,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoutingBoardItem, PlayerSearchResult } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

const TIERS = [
  { id: 'top-target', label: 'Top Targets', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'watching',   label: 'Watching',    color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { id: 'offered',    label: 'Offered',     color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30', badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
] as const;

export function CoachScoutingBoard() {
  const [board, setBoard] = useState<ScoutingBoardItem[]>([]);
  const [players, setPlayers] = useState<Map<number, PlayerSearchResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTier, setActiveTier] = useState<string>('all');
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const { showNotification } = useNotifications();

  const fetchScoutingBoard = useCallback(async () => {
    setLoadError(false);
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/api/coach/board', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        const rawBoard: ScoutingBoardItem[] = data.board || [];
        setBoard(rawBoard);

        // Fetch player details for items that need it
        const playerPromises = rawBoard.map(async (item: ScoutingBoardItem) => {
          if (item.player) {
            return { id: item.playerId, data: item.player };
          }
          try {
            const pRes = await fetch(`/api/coach/players/${item.playerId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              return { id: item.playerId, data: pData };
            }
          } catch {
            // Non-critical fallback
          }
          return null;
        });

        const playerResults = await Promise.all(playerPromises);
        const playerMap = new Map<number, PlayerSearchResult>();
        playerResults.forEach((res) => {
          if (res?.data) {
            const p = res.data;
            const normalized: PlayerSearchResult = {
              id: p.id,
              name: p.name || 'Unknown Athlete',
              position: p.position || 'ATH',
              state: p.state || 'N/A',
              city: p.city || '',
              school: p.school || 'High School',
              gradYear: p.gradYear || 2026,
              height: p.height,
              weight: p.weight,
              gpa: p.gpa,
              breakoutScore: p.breakoutScore ?? 80,
              stars: p.stars ?? 4,
              archetype: p.archetype,
              stats: p.stats,
              combineStats: p.combineStats,
              highlights: Array.isArray(p.highlights) ? p.highlights.length : (p.highlights || 0),
              verified: Boolean(p.verified),
              offers: Array.isArray(p.offers) ? p.offers.length : (p.offers || 0),
              committed: Boolean(p.committed),
              nilPoints: p.nilPoints ?? 0,
              highlightThumbnailUrl: p.highlightThumbnailUrl,
              profileImage: p.profileImage,
            };
            playerMap.set(res.id, normalized);
          }
        });
        setPlayers(playerMap);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
      showNotification('error', 'Load Failed', 'Could not load your scouting board. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchScoutingBoard();
  }, [fetchScoutingBoard]);

  const removeFromBoard = async (playerId: number) => {
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch(`/api/coach/players/${playerId}/save`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok || res.status === 200 || res.status === 204) {
        setBoard(prev => prev.filter(item => item.playerId !== playerId));
        showNotification('info', 'Prospect Removed', 'Player removed from scouting board.');
      }
    } catch {
      showNotification('error', 'Remove Failed', 'Could not remove player.');
    }
  };

  const updateTier = async (playerId: number, newTier: 'top-target' | 'watching' | 'offered') => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/api/coach/players/${playerId}/tier`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (response.ok) {
        setBoard(prev => prev.map(item =>
          item.playerId === playerId ? { ...item, tier: newTier } : item
        ));
        const tierObj = TIERS.find(t => t.id === newTier);
        showNotification('success', 'Tier Updated', `Moved to ${tierObj?.label || newTier}`);
      }
    } catch {
      showNotification('error', 'Update Failed', 'Could not update player tier.');
    }
  };

  const saveNotes = async (playerId: number) => {
    setSavingNotes(true);
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch(`/api/coach/players/${playerId}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes: notesText }),
      });

      if (res.ok) {
        setBoard(prev => prev.map(item =>
          item.playerId === playerId ? { ...item, notes: notesText } : item
        ));
        setEditingNotesId(null);
        showNotification('success', 'Notes Saved', 'Coaching evaluation notes updated.');
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not save notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const startEditingNotes = (item: ScoutingBoardItem) => {
    setEditingNotesId(item.playerId);
    setNotesText(item.notes || '');
  };

  const getTierCount = (tierId: string) => {
    return board.filter(item => item.tier === tierId).length;
  };

  const filteredBoard = activeTier === 'all'
    ? board
    : board.filter(item => item.tier === activeTier);

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
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface-card border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">Recruiting Pipeline</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-display">
            Scouting Board
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Track prioritized recruits, manage offer tiers, and maintain confidential staff evaluations.
          </p>
        </div>
        <Link
          to="/coach/search"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(34,197,94,0.25)] text-sm"
        >
          <Search className="w-4 h-4" />
          <span>Find More Recruits</span>
        </Link>
      </div>

      {/* Pipeline Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-surface-card border border-white/10 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Total Pipeline</div>
          <div className="text-2xl font-black text-white font-display">{board.length}</div>
          <div className="text-[10px] text-ink-muted mt-1">Active recruits tracked</div>
        </div>
        <div className="p-4 bg-surface-card border border-red-500/20 rounded-2xl bg-gradient-to-br from-red-500/5 to-transparent">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Top Targets</div>
          <div className="text-2xl font-black text-red-400 font-display">{getTierCount('top-target')}</div>
          <div className="text-[10px] text-ink-muted mt-1">Highest priority</div>
        </div>
        <div className="p-4 bg-surface-card border border-yellow-500/20 rounded-2xl bg-gradient-to-br from-yellow-500/5 to-transparent">
          <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">Watching</div>
          <div className="text-2xl font-black text-yellow-400 font-display">{getTierCount('watching')}</div>
          <div className="text-[10px] text-ink-muted mt-1">Under evaluation</div>
        </div>
        <div className="p-4 bg-surface-card border border-green-500/20 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent">
          <div className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1">Offered</div>
          <div className="text-2xl font-black text-green-400 font-display">{getTierCount('offered')}</div>
          <div className="text-[10px] text-ink-muted mt-1">Offers extended</div>
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTier('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTier === 'all'
              ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
              : 'bg-surface-card border border-white/10 text-ink-muted hover:text-white'
          }`}
        >
          All Recruits ({board.length})
        </button>
        {TIERS.map((tier) => {
          const count = getTierCount(tier.id);
          const active = activeTier === tier.id;
          return (
            <button
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                active
                  ? `${tier.bg} ${tier.color} ${tier.border} shadow-lg`
                  : 'bg-surface-card border-white/10 text-ink-muted hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${active ? 'bg-current animate-pulse' : 'bg-white/30'}`} />
              <span>{tier.label}</span>
              <span className="text-[11px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Board Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-white/10 rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-ink-muted uppercase tracking-wider font-bold">Loading scouting board...</p>
        </div>
      ) : loadError ? (
        <div className="p-8 text-center bg-surface-card border border-coral-500/20 rounded-2xl">
          <p className="text-sm text-coral-400 mb-3">Could not load your scouting board.</p>
          <button
            onClick={() => { setLoading(true); fetchScoutingBoard(); }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs"
          >
            Retry
          </button>
        </div>
      ) : filteredBoard.length === 0 ? (
        <div className="p-16 text-center bg-surface-card border border-white/10 rounded-2xl space-y-4">
          <Target className="w-12 h-12 text-ink-muted mx-auto opacity-30" />
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {activeTier === 'all'
                ? 'Your Scouting Board is Empty'
                : `No Prospects in ${TIERS.find(t => t.id === activeTier)?.label}`}
            </h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {activeTier === 'all'
                ? 'Search for elite talent and add prospects to your pipeline to organize evaluations.'
                : 'Move recruits into this tier or add more athletes from player search.'}
            </p>
          </div>
          <Link
            to="/coach/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(34,197,94,0.25)]"
          >
            <Search className="w-4 h-4" />
            <span>Search Prospects</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoard.map((item) => {
            const player = players.get(item.playerId);
            const tierInfo = TIERS.find(t => t.id === item.tier) || TIERS[1];
            const isEditingNotes = editingNotesId === item.playerId;

            return (
              <div
                key={item.playerId}
                className="bg-surface-card border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 shadow-xl flex flex-col justify-between"
              >
                <div className="p-5">
                  {/* Card Header & Tier Pill */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Link
                          to={`/coach/player/${item.playerId}`}
                          className="text-lg font-bold text-white hover:text-green-400 transition-colors truncate block"
                        >
                          {player?.name || `Prospect #${item.playerId}`}
                        </Link>
                        {player?.verified && (
                          <Award className="w-4 h-4 text-green-400 shrink-0" title="Verified Athlete" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-ink-muted">
                        <span className="flex items-center gap-1 text-white font-semibold">
                          <Users className="w-3.5 h-3.5 text-green-400" />
                          {player?.position || 'ATH'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {player?.state || 'US'}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          '{player?.gradYear || '26'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromBoard(item.playerId)}
                      className="p-1.5 text-ink-muted hover:text-coral-500 rounded-lg hover:bg-coral-500/10 transition-colors"
                      title="Remove from board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* School / Club */}
                  <p className="text-xs text-ink-muted mb-3 truncate">
                    {[player?.school, player?.city].filter(Boolean).join(' • ') || 'High School Prospect'}
                  </p>

                  {/* Tier Selector Row */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        Recruiting Tier
                      </label>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierInfo.badge}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {tierInfo.label}
                      </span>
                    </div>
                    <select
                      value={item.tier}
                      onChange={(e) => updateTier(item.playerId, e.target.value as 'top-target' | 'watching' | 'offered')}
                      className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:border-green-500/60 focus:outline-none transition-colors"
                    >
                      {TIERS.map((t) => (
                        <option key={t.id} value={t.id}>
                          Move to {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Metrics Row */}
                  {player && (
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface-hover/60 border border-white/5 rounded-xl mb-4 text-center">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-ink-muted">Breakout</div>
                        <div className="text-sm font-black text-green-400 flex items-center justify-center gap-0.5">
                          <Sparkles className="w-3 h-3 text-green-400" />
                          {player.breakoutScore}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-ink-muted">Rating</div>
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
                  )}

                  {/* Coaching Notes Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                        <FileText className="w-3 h-3 text-green-400" />
                        Private Scouting Notes
                      </span>
                      {!isEditingNotes && (
                        <button
                          onClick={() => startEditingNotes(item)}
                          className="text-[11px] text-green-400 hover:text-green-300 font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {item.notes ? 'Edit' : 'Add Note'}
                        </button>
                      )}
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Log scout notes, combine metrics impressions, campus visit status..."
                          className="w-full bg-surface-hover border border-white/15 rounded-xl p-3 text-xs text-white placeholder:text-ink-muted focus:border-green-500/60 focus:outline-none resize-none h-24"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            disabled={savingNotes}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-ink-muted hover:text-white rounded-lg text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveNotes(item.playerId)}
                            disabled={savingNotes}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            {savingNotes ? (
                              <div className="w-3 h-3 rounded-full border border-black border-t-transparent animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Save Note</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditingNotes(item)}
                        className="p-3 bg-surface-hover/50 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-colors min-h-[52px]"
                      >
                        {item.notes ? (
                          <p className="text-xs text-white/90 leading-relaxed line-clamp-3">
                            {item.notes}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-muted italic">
                            Click to add private evaluation notes...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Quick Profile Link */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-surface/50 text-xs">
                  <div className="text-ink-muted font-medium">
                    {player?.offers || 0} Offers Extended
                  </div>
                  <Link
                    to={`/coach/player/${item.playerId}`}
                    className="inline-flex items-center gap-1 text-green-400 hover:text-green-300 font-bold transition-colors"
                  >
                    <span>Full Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}