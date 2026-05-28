
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  User,
  Clock,
  Check,
  CheckCheck,
  Image,
  Paperclip,
  Smile
} from 'lucide-react';

interface Conversation {
  id: number;
  participant: {
    name: string;
    avatar: string;
    role: 'coach' | 'athlete' | 'recruiter';
    isOnline: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    isFromMe: boolean;
    isRead: boolean;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  isRead: boolean;
  type: 'text' | 'image' | 'file';
  attachment?: string;
}

export const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockConversations: Conversation[] = [
      {
        id: 1,
        participant: {
          name: 'Coach Anderson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Coach',
          role: 'coach',
          isOnline: true
        },
        lastMessage: {
          text: 'Great game last Friday! Your performance was outstanding.',
          timestamp: '2 min ago',
          isFromMe: false,
          isRead: false
        },
        unreadCount: 2
      },
      {
        id: 2,
        participant: {
          name: 'Sarah Johnson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          role: 'athlete',
          isOnline: false
        },
        lastMessage: {
          text: 'Thanks for the feedback on my QB mechanics!',
          timestamp: '1 hour ago',
          isFromMe: true,
          isRead: true
        },
        unreadCount: 0
      },
      {
        id: 3,
        participant: {
          name: 'Recruiter Mike',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
          role: 'recruiter',
          isOnline: true
        },
        lastMessage: {
          text: 'We\'d love to discuss your future at State University.',
          timestamp: '3 hours ago',
          isFromMe: false,
          isRead: true
        },
        unreadCount: 1
      }
    ];

    setConversations(mockConversations);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      // Mock messages for selected conversation
      const mockMessages: Message[] = [
        {
          id: 1,
          text: 'Hi! I saw your profile and was impressed by your stats.',
          timestamp: 'Yesterday 2:30 PM',
          isFromMe: false,
          isRead: true,
          type: 'text'
        },
        {
          id: 2,
          text: 'Thank you! I\'ve been working really hard on my training.',
          timestamp: 'Yesterday 2:35 PM',
          isFromMe: true,
          isRead: true,
          type: 'text'
        },
        {
          id: 3,
          text: 'That shows. Your 40-yard dash time is excellent for a QB.',
          timestamp: 'Yesterday 2:36 PM',
          isFromMe: false,
          isRead: true,
          type: 'text'
        },
        {
          id: 4,
          text: 'Thanks! Coach has been helping me with speed training.',
          timestamp: '2 hours ago',
          isFromMe: true,
          isRead: true,
          type: 'text'
        },
        {
          id: 5,
          text: 'Great game last Friday! Your performance was outstanding.',
          timestamp: '2 min ago',
          isFromMe: false,
          isRead: false,
          type: 'text'
        }
      ];
      setMessages(mockMessages);
    }
  }, [selectedConversation]);

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      const message: Message = {
        id: Date.now(),
        text: newMessage,
        timestamp: new Date().toLocaleTimeString(),
        isFromMe: true,
        isRead: true,
        type: 'text'
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'coach': return 'text-blue-500';
      case 'athlete': return 'text-green-500';
      case 'recruiter': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-dark-900 rounded-2xl overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-80 bg-dark-800 border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Messages</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <motion.div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                selectedConversation === conversation.id ? 'bg-brand-500/10 border-l-4 border-l-brand-500' : ''
              }`}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent p-0.5">
                    <div className="w-full h-full rounded-[14px] bg-dark-800 overflow-hidden">
                      <img src={conversation.participant.avatar} alt={conversation.participant.name} />
                    </div>
                  </div>
                  {conversation.participant.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-dark-800"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-bold truncate">{conversation.participant.name}</h3>
                    <span className="text-xs text-dark-500">{conversation.lastMessage.timestamp}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${conversation.lastMessage.isRead ? 'text-dark-400' : 'text-white'}`}>
                      {conversation.lastMessage.isFromMe && 'You: '}{conversation.lastMessage.text}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className={`text-xs uppercase tracking-widest ${getRoleColor(conversation.participant.role)}`}>
                    {conversation.participant.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent p-0.5">
                    <div className="w-full h-full rounded-[14px] bg-dark-800 overflow-hidden">
                      <img src={selectedConv.participant.avatar} alt={selectedConv.participant.name} />
                    </div>
                  </div>
                  {selectedConv.participant.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-dark-800"></div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{selectedConv.participant.name}</h2>
                  <p className={`text-sm uppercase tracking-widest ${getRoleColor(selectedConv.participant.role)}`}>
                    {selectedConv.participant.role} • {selectedConv.participant.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-dark-400 hover:text-white transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-2 text-dark-400 hover:text-white transition-colors">
                  <Video size={20} />
                </button>
                <button className="p-2 text-dark-400 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.isFromMe
                      ? 'bg-brand-500 text-white'
                      : 'bg-dark-800 text-white border border-white/5'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                      message.isFromMe ? 'text-brand-200' : 'text-dark-500'
                    }`}>
                      <span>{message.timestamp}</span>
                      {message.isFromMe && (
                        message.isRead ? <CheckCheck size={12} /> : <Check size={12} />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-white/5">
              <div className="flex items-center gap-4">
                <button className="p-2 text-dark-400 hover:text-white transition-colors">
                  <Paperclip size={20} />
                </button>
                <button className="p-2 text-dark-400 hover:text-white transition-colors">
                  <Image size={20} />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="w-full bg-dark-800 border border-white/5 rounded-2xl py-3 px-4 pr-12 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-white transition-colors">
                    <Smile size={18} />
                  </button>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-dark-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto text-dark-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Select a conversation</h3>
              <p className="text-dark-400">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
