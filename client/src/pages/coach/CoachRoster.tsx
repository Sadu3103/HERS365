import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Eye,
  Trash2,
  Star,
  MapPin,
  GraduationCap,
  Award,
  Download,
  Pencil,
  Check,
  X,
  Binoculars,
  Phone,
  Send,
  CheckCircle2,
} from 'lucide-react';
import type { PlayerSearchResult } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

type RosterStatus = 'watching' | 'contacted' | 'offered' | 'committed';

interface RosterAthlete extends PlayerSearchResult {
  status: RosterStatus;
  notes: string;
}

const STATUSES: {
  id: RosterStatus;
  label: string;
  icon: typeof Binoculars;
  badge: string;
  text: string;
}[] = [
  { id: 'watching', label: 'Watching', icon: Binoculars, badge: 'bg-yellow-600/20 border-yellow-600/40', text: 'text-yellow-400' },
  { id: 'contacted', label: 'Contacted', icon: Phone, badge: 'bg-blue-600/20 border-blue-600/40', text: 'text-blue-400' },
  { id: 'offered', label: 'Offered', icon: Send, badge: 'bg-purple-600/20 border-purple-600/40', text: 'text-purple-400' },
  { id: 'committed', label: 'Committed', icon: CheckCircle2, badge: 'bg-green-600/20 border-green-600/40', text: 'text-green-400' },
];

const statusMeta = (status: RosterStatus) => STATUSES.find((s) => s.id === status)!;

const MOCK_ROSTER: RosterAthlete[] = [
  {
    id: 101, name: 'Maya Thompson', position: 'QB', state: 'TX', city: 'Austin', school: 'Westlake HS',
    gradYear: 2026, height: "5'9\"", weight: 165, gpa: 3.8, breakoutScore: 94, stars: 5, archetype: 'Dual-Threat',
    stats: {} as any, combineStats: {} as any, highlights: 12, verified: true, offers: 8, committed: false, nilPoints: 14200,
    status: 'offered', notes: 'Elite arm talent. Following up after spring camp.',
  },
  {
    id: 102, name: 'Jordan Reyes', position: 'WR', state: 'CA', city: 'Long Beach', school: 'Poly HS',
    gradYear: 2026, height: "5'7\"", weight: 140, gpa: 3.6, breakoutScore: 89, stars: 4, archetype: 'Speedster',
    stats: {} as any, combineStats: {} as any, highlights: 9, verified: true, offers: 5, committed: false, nilPoints: 9800,
    status: 'contacted', notes: 'Sub-4.5 speed. Coach spoke with family last week.',
  },
  {
    id: 103, name: 'Aaliyah Brooks', position: 'CB', state: 'FL', city: 'Miami', school: 'Northwestern HS',
    gradYear: 2027, height: "5'8\"", weight: 145, gpa: 4.0, breakoutScore: 91, stars: 5, archetype: 'Lockdown',
    stats: {} as any, combineStats: {} as any, highlights: 14, verified: true, offers: 7, committed: true, nilPoints: 12500,
    status: 'committed', notes: 'Verbally committed. Lock down academics for early enrollment.',
  },
  {
    id: 104, name: 'Sofia Martinez', position: 'RB', state: 'GA', city: 'Atlanta', school: 'Grayson HS',
    gradYear: 2026, height: "5'5\"", weight: 155, gpa: 3.4, breakoutScore: 86, stars: 4, archetype: 'Power Back',
    stats: {} as any, combineStats: {} as any, highlights: 7, verified: false, offers: 3, committed: false, nilPoints: 6700,
    status: 'watching', notes: 'Physical runner. Monitor junior season production.',
  },
  {
    id: 105, name: 'Destiny Coleman', position: 'S', state: 'OH', city: 'Cleveland', school: 'Glenville HS',
    gradYear: 2027, height: "5'10\"", weight: 150, gpa: 3.7, breakoutScore: 88, stars: 4, archetype: 'Playmaker',
    stats: {} as any, combineStats: {} as any, highlights: 10, verified: true, offers: 4, committed: false, nilPoints: 8100,
    status: 'contacted', notes: 'Range and ball skills stand out. Sent camp invite.',
  },
  {
    id: 106, name: 'Riley Nguyen', position: 'ATH', state: 'WA', city: 'Seattle', school: 'Eastside Catholic',
    gradYear: 2026, height: "5'8\"", weight: 148, gpa: 3.9, breakoutScore: 92, stars: 5, archetype: 'Playmaker',
    stats: {} as any, combineStats: {} as any, highlights: 13, verified: true, offers: 6, committed: false, nilPoints: 11300,
    status: 'offered', notes: 'Versatile two-way player. Offer extended, awaiting visit.',
  },
  {
    id: 107, name: 'Camila Foster', position: 'LB', state: 'AZ', city: 'Phoenix', school: 'Hamilton HS',
    gradYear: 2027, height: "5'9\"", weight: 158, gpa: 3.5, breakoutScore: 84, stars: 3, archetype: 'Power Back',
    stats: {} as any, combineStats: {} as any, highlights: 6, verified: false, offers: 2, committed: false, nilPoints: 5400,
    status: 'watching', notes: 'High motor. Needs to add length but instincts are there.',
  },
];

export function CoachRoster() {
  const [roster, setRoster] = useState<RosterAthlete[]>(MOCK_ROSTER);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const { showNotification } = useNotifications();

  const statusCounts = useMemo(() => {
    return STATUSES.reduce<Record<RosterStatus, number>>((acc, s) => {
      acc[s.id] = roster.filter((a) => a.status === s.id).length;
      return acc;
    }, { watching: 0, contacted: 0, offered: 0, committed: 0 });
  }, [roster]);

  const changeStatus = (id: number, status: RosterStatus) => {
    const athlete = roster.find((a) => a.id === id);
    setRoster((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    showNotification('success', 'Status Updated', `${athlete?.name} moved to ${statusMeta(status).label}.`);
  };

  const removeAthlete = (id: number) => {
    const athlete = roster.find((a) => a.id === id);
    setRoster((prev) => prev.filter((a) => a.id !== id));
    if (editingNotes === id) setEditingNotes(null);
    showNotification('info', 'Removed from Roster', `${athlete?.name} was removed from your roster.`);
  };

  const startEditNotes = (id: number, current: string) => {
    setEditingNotes(id);
    setNotesDraft(current);
  };

  const saveNotes = (id: number) => {
    const athlete = roster.find((a) => a.id === id);
    setRoster((prev) => prev.map((a) => (a.id === id ? { ...a, notes: notesDraft } : a)));
    setEditingNotes(null);
    setNotesDraft('');
    showNotification('success', 'Notes Saved', `Notes updated for ${athlete?.name}.`);
  };

  const exportToCSV = () => {
    if (roster.length === 0) {
      showNotification('warning', 'Nothing to Export', 'Your roster is empty.');
      return;
    }
    const headers = ['Name', 'Position', 'School', 'State', 'Grad Year', 'Breakout Score', 'Stars', 'Status', 'Notes'];
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = roster.map((a) => [
      a.name, a.position, a.school, a.state, a.gradYear, a.breakoutScore, a.stars, statusMeta(a.status).label, a.notes,
    ].map(escape).join(','));
    const csv = [headers.map(escape).join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', 'Export Complete', `Exported ${roster.length} athletes to CSV.`);
  };

  const renderStars = (stars: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
    ));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">My Roster</h1>
              <p className="text-gray-400 mt-2">Manage your shortlisted and recruited athletes</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Export to CSV
              </button>
              <Link
                to="/coach/search"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Find Athletes
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Athletes</p>
                <p className="text-2xl font-bold text-white mt-1">{roster.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          {STATUSES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{s.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{statusCounts[s.id]}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${s.text}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Roster */}
        {roster.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">Your roster is empty</h3>
            <p className="text-gray-500 mb-6">Start building your roster by shortlisting athletes from the player search.</p>
            <Link
              to="/coach/search"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Search Athletes
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Athlete</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">School</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((athlete, idx) => {
                    const meta = statusMeta(athlete.status);
                    return (
                      <motion.tr
                        key={athlete.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="border-b border-gray-700/60 last:border-0 hover:bg-gray-700/30 transition-colors align-top"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/coach/player/${athlete.id}`} className="font-semibold text-white hover:text-blue-400 transition-colors">
                              {athlete.name}
                            </Link>
                            {athlete.verified && <Award className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{athlete.state}</span>
                            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{athlete.gradYear}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block bg-gray-700 text-gray-200 text-xs font-semibold px-2.5 py-1 rounded">
                            {athlete.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{athlete.school}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-400">{athlete.breakoutScore}</span>
                            <div className="flex">{renderStars(athlete.stars)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block">
                            <select
                              value={athlete.status}
                              onChange={(e) => changeStatus(athlete.id, e.target.value as RosterStatus)}
                              className={`appearance-none cursor-pointer border rounded-full pl-3 pr-8 py-1.5 text-xs font-semibold ${meta.badge} ${meta.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s.id} value={s.id} className="bg-gray-800 text-white">
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 min-w-[16rem]">
                          {editingNotes === athlete.id ? (
                            <div className="flex items-start gap-2">
                              <textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                autoFocus
                                rows={2}
                                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Add notes..."
                              />
                              <div className="flex flex-col gap-1">
                                <button onClick={() => saveNotes(athlete.id)} className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors" title="Save">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingNotes(null)} className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors" title="Cancel">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditNotes(athlete.id, athlete.notes)}
                              className="group flex items-start gap-2 text-left text-sm w-full"
                            >
                              <span className={athlete.notes ? 'text-gray-300' : 'text-gray-500 italic'}>
                                {athlete.notes || 'Click to add notes...'}
                              </span>
                              <Pencil className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/coach/player/${athlete.id}`}
                              className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                              title="View profile"
                            >
                              <Eye className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => removeAthlete(athlete.id)}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                              title="Remove from roster"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {roster.map((athlete, idx) => {
                const meta = statusMeta(athlete.status);
                return (
                  <motion.div
                    key={athlete.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/coach/player/${athlete.id}`} className="text-lg font-semibold text-white hover:text-blue-400 transition-colors truncate">
                            {athlete.name}
                          </Link>
                          {athlete.verified && <Award className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="bg-gray-700 text-gray-200 font-semibold px-2 py-0.5 rounded">{athlete.position}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{athlete.state}</span>
                          <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{athlete.gradYear}</span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{athlete.school}</p>
                      </div>
                      <button
                        onClick={() => removeAthlete(athlete.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove from roster"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-green-400">{athlete.breakoutScore}</span>
                        <div className="flex">{renderStars(athlete.stars)}</div>
                      </div>
                      <Link to={`/coach/player/${athlete.id}`} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        <Eye className="w-4 h-4" /> Profile
                      </Link>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                      <select
                        value={athlete.status}
                        onChange={(e) => changeStatus(athlete.id, e.target.value as RosterStatus)}
                        className={`w-full appearance-none cursor-pointer border rounded-lg px-3 py-2 text-sm font-semibold ${meta.badge} ${meta.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.id} value={s.id} className="bg-gray-800 text-white">{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
                      {editingNotes === athlete.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            autoFocus
                            rows={3}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add notes..."
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveNotes(athlete.id)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">Save</button>
                            <button onClick={() => setEditingNotes(null)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditNotes(athlete.id, athlete.notes)}
                          className="w-full text-left bg-gray-700/50 border border-gray-700 rounded px-3 py-2 text-sm min-h-[2.5rem] hover:bg-gray-700 transition-colors"
                        >
                          <span className={athlete.notes ? 'text-gray-300' : 'text-gray-500 italic'}>
                            {athlete.notes || 'Click to add notes...'}
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
