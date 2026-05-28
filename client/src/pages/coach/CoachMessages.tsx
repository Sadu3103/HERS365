import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Eye, Users, MapPin } from 'lucide-react';
import type { CoachMessage } from '../../types';

export function CoachMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Map<number, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/coach/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (playerId: number) => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/coach/message/${playerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        setSelectedPlayerId(null);
        // Refresh messages to show the new one
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const mockPlayers = [
    { id: 1, name: 'Aaliyah Thompson', position: 'WR', school: 'Westlake High', state: 'TX' },
    { id: 2, name: 'Jordan Davis', position: 'QB', school: 'Miami Southridge', state: 'FL' },
    { id: 3, name: 'Maya Rodriguez', position: 'CB', school: 'Crenshaw High', state: 'CA' },
    { id: 4, name: 'Destiny Williams', position: 'RB', school: 'Westlake HS (GA)', state: 'GA' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Messages</h1>
              <p className="text-gray-400 mt-2">Communicate with athletes and parents</p>
            </div>
            <Link
              to="/coach/search"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Find Players
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Message List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 border border-gray-700 rounded-lg">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Message History</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-400 mb-2">No messages yet</h3>
                  <p className="text-gray-500 mb-6">Start a conversation with a player to get their contact information</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {messages.map((message) => (
                    <div key={message.id} className="p-6 hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">
                              {message.senderType === 'coach' ? `To: ${message.athleteName}` : `From: ${message.athleteName}`}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {new Date(message.createdAt).toLocaleDateString()} at {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm ${message.read ? 'text-gray-400' : 'text-green-400'}`}>
                            {message.read ? 'Read' : 'Sent'}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-300">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compose Message */}
          <div className="space-y-6">
            {/* Quick Compose */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Send Message</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Player</label>
                  <select
                    value={selectedPlayerId || ''}
                    onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Choose a player...</option>
                    {mockPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} - {player.position} ({player.school})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Introduce yourself and express interest in recruiting this athlete..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 h-32 resize-none"
                  />
                </div>

                <button
                  onClick={() => selectedPlayerId && sendMessage(selectedPlayerId)}
                  disabled={!selectedPlayerId || !newMessage.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </div>
            </div>

            {/* Player Directory */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Contacts</h3>

              <div className="space-y-3">
                {mockPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{player.name}</h4>
                      <p className="text-gray-400 text-sm">{player.position} • {player.school}</p>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        {player.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Guidelines */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Messaging Guidelines</h3>

              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Always introduce yourself and your program clearly</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Be respectful and professional in all communications</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Focus on the athlete's interests and fit for your program</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Include specific reasons why you're interested in them</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}