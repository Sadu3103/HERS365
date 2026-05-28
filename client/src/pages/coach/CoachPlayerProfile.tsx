import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, Heart, MessageSquare, Award, Star, Users, MapPin, GraduationCap, Ruler, Weight, Clock, Target } from 'lucide-react';
import type { PlayerProfile } from '../../types';

export function CoachPlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPlayerProfile(Number(id));
    }
  }, [id]);

  const fetchPlayerProfile = async (playerId: number) => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/coach/players/${playerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayer(data);
      }
    } catch (error) {
      console.error('Failed to fetch player profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSavePlayer = async () => {
    if (!player) return;

    try {
      const token = localStorage.getItem('coachToken');
      if (isSaved) {
        await fetch(`/coach/players/${player.id}/save`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setIsSaved(false);
      } else {
        await fetch(`/coach/players/${player.id}/save`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier: 'watching' }),
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to save player:', error);
    }
  };

  const sendMessage = async () => {
    if (!player) return;

    const message = `Hi ${player.name}, I'm interested in recruiting you for our program. I'd love to discuss your future and how you might fit with our team.`;

    try {
      const token = localStorage.getItem('coachToken');
      await fetch(`/coach/message/${player.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      // In a real app, you'd show a success message
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Player Not Found</h1>
          <Link to="/coach/search" className="text-blue-400 hover:text-blue-300">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'stats', label: 'Stats', icon: Target },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'highlights', label: 'Highlights', icon: Award },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/coach/search"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Search
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Player Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                <Users className="w-12 h-12 text-gray-400" />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{player.name}</h1>
                  {player.verified && (
                    <Award className="w-6 h-6 text-blue-400" />
                  )}
                </div>

                <div className="flex items-center gap-6 text-gray-400 mb-3">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {player.position}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {player.city}, {player.state}
                  </span>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {player.school} • Class of {player.gradYear}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {renderStars(player.stars)}
                  </div>
                  <span className="text-green-400 font-semibold">Breakout Score: {player.breakoutScore}</span>
                  <span className="text-yellow-400 font-semibold">NIL Points: {player.nilPoints.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={toggleSavePlayer}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSaved
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save Player'}
              </button>

              <button
                onClick={sendMessage}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Contact Player
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">{player.breakoutScore}</div>
                    <div className="text-gray-400">Breakout Score</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">{player.nilPoints.toLocaleString()}</div>
                    <div className="text-gray-400">NIL Points</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{player.offers.length}</div>
                    <div className="text-gray-400">Offers Received</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Physical Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-400">Height</span>
                    </div>
                    <div className="text-xl font-semibold text-white">{player.height}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-400">Weight</span>
                    </div>
                    <div className="text-xl font-semibold text-white">{player.weight} lbs</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-400">Archetype</span>
                    </div>
                    <div className="text-xl font-semibold text-white">{player.archetype}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">College Offers</h3>
                {player.offers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {player.offers.map((offer, index) => (
                      <span key={index} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                        {offer}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No offers yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Season Statistics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="pb-3 text-gray-400 font-medium">Category</th>
                      <th className="pb-3 text-gray-400 font-medium">Stat</th>
                      <th className="pb-3 text-gray-400 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {player.stats && Object.entries(player.stats).map(([key, value]) => (
                      <tr key={key} className="py-3">
                        <td className="py-3 text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                        <td className="py-3 text-gray-400">{key}</td>
                        <td className="py-3 text-white font-semibold">{value || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'measurements' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Combine Measurements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {player.combineStats && Object.entries(player.combineStats).map(([key, value]) => (
                  <div key={key} className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                    <div className="text-xl font-semibold text-white">{value || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'highlights' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Highlight Videos</h3>
              {player.highlights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {player.highlights.map((highlight, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg overflow-hidden">
                      <div className="aspect-video bg-gray-600 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Video Preview</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-white font-medium mb-2">{highlight.title}</h4>
                        <p className="text-gray-400 text-sm">
                          {highlight.locked ? 'Premium Content - Contact Required' : 'Available to Coaches'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No highlights available</p>
              )}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Academic Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 mb-1">GPA</div>
                    <div className="text-2xl font-semibold text-white">{player.academicProfile.gpa}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 mb-1">Intended Major</div>
                    <div className="text-xl font-semibold text-white">{player.academicProfile.major}</div>
                  </div>
                  {player.academicProfile.act && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 mb-1">ACT Score</div>
                      <div className="text-2xl font-semibold text-white">{player.academicProfile.act}</div>
                    </div>
                  )}
                  {player.academicProfile.sat && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 mb-1">SAT Score</div>
                      <div className="text-2xl font-semibold text-white">{player.academicProfile.sat}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}