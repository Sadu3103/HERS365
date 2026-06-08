import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Zap,
  Trophy,
  Calendar,
  PlayCircle,
  Award,
  Flag,
  EyeOff,
  UserX
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface PostData {
  id: number;
  user: { name: string; avatar: string | null };
  time: string;
  content: string;
  image?: string;
  likes: string;
  comments: string;
  highlights: boolean;
  isLiked?: boolean;
}

const PostCard = ({
  post,
  onLike,
  onComment,
  onShare,
  onUserClick,
  onMenuClick,
  onHighlightClick,
  onPostClick
}: {
  post: PostData;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
  onShare: (postId: number) => void;
  onUserClick: (userId: string) => void;
  onMenuClick: (postId: number) => void;
  onHighlightClick: (postId: number) => void;
  onPostClick: (postId: number) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => onPostClick(post.id)}
      className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl mb-8 group cursor-pointer hover:bg-white/5 transition-colors"
    >
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUserClick(post.user.name);
          }}
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-coral-500 to-green-500 p-0.5 shadow-lg shadow-coral-500/20">
            <div className="w-full h-full rounded-[14px] bg-surface-card overflow-hidden">
              <img src={post.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.name}`} alt={post.user.name} />
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold tracking-tight uppercase text-sm hover:text-coral-400 transition-colors">{post.user.name}</h3>
            <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">{post.time}</p>
          </div>
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="text-ink-muted hover:text-white transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {/* Post Menu Dropdown */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-48 bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50"
              >
                <div className="p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMenuClick(post.id);
                      setMenuOpen(false);
                      showNotification('success', 'Post Reported', 'Thank you for keeping the community safe!');
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <Flag size={16} />
                    Report Post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      showNotification('info', 'Post Hidden', 'This post has been hidden from your feed.');
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-ink-muted hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <EyeOff size={16} />
                    Hide Post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      showNotification('info', 'User Blocked', 'You will no longer see content from this user.');
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-ink-muted hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <UserX size={16} />
                    Block User
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-ink-muted mb-6 text-base leading-relaxed">
        {post.content}
      </p>

      {post.image && (
        <div className="relative rounded-2xl overflow-hidden border border-white/5 mb-6 aspect-video group-hover:border-coral-500/30 transition-all duration-500">
           <img src={post.image} alt="Post Highlight" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            {post.highlights && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onHighlightClick(post.id);
                }}
                className="absolute top-4 right-4 px-3 py-1 bg-coral-500 hover:bg-coral-600 rounded-full flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                 <PlayCircle size={14} className="text-white fill-current" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white">Watch Highlight</span>
              </button>
            )}
        </div>
      )}

      <div className="flex items-center gap-8 pt-6 border-t border-white/5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(post.id);
          }}
          className={`flex items-center gap-2 transition-all group/btn ${
            post.isLiked ? 'text-green-500' : 'text-ink-muted hover:text-green-500'
          }`}
        >
          <Heart size={18} className={`transition-all ${post.isLiked ? 'fill-green-500' : 'group-hover/btn:fill-green-500'}`} />
          <span className="text-xs font-black uppercase tracking-widest">{post.likes}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComment(post.id);
          }}
          className="flex items-center gap-2 text-ink-muted hover:text-white transition-all"
        >
          <MessageCircle size={18} />
          <span className="text-xs font-black uppercase tracking-widest">{post.comments}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(post.id);
          }}
          className="flex items-center gap-2 text-ink-muted hover:text-white ml-auto transition-all"
        >
          <Share2 size={18} />
        </button>
      </div>
    </div>
  </motion.div>
  );
};

export const Feed = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [feedType, setFeedType] = useState<'recent' | 'trending'>('recent');
  const [posts, setPosts] = useState<PostData[]>([
    {
      id: 1,
      user: { name: 'Sarah Watkins', avatar: null },
      time: '2 hours ago',
      content: "Just finished a killer session at the Nike Training Camp. 40yd dash improved by 0.2s! Hard work pays off. 🏈💨",
      image: "https://images.unsplash.com/photo-1541252260730-0412e3e2108e?auto=format&fit=crop&q=80&w=1200",
      likes: '1.2K',
      comments: '84',
      highlights: true,
      isLiked: false
    },
    {
      id: 2,
      user: { name: 'Coach Miller', avatar: null },
      time: '5 hours ago',
      content: "Looking for a dynamic wide receiver for the 2026 class. Show us what you've got in the next regional combine! 🎯",
      likes: '450',
      comments: '12',
      highlights: false,
      isLiked: false
    }
  ]);

  const handleLike = (postId: number) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked }
          : post
      )
    );
  };

  const handleComment = (_postId: number) => {
    showNotification('info', 'Coming Soon', 'Comments are on the way — stay tuned!');
  };

  const handleShare = (postId: number) => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      showNotification('success', 'Link Copied', 'Post link copied to clipboard!');
    }).catch(() => {
      showNotification('error', 'Copy Failed', `Share this link: ${postUrl}`);
    });
  };

  const handleUserClick = (userName: string) => {
    // Navigate to user profile
    navigate(`/profile/${encodeURIComponent(userName)}`);
  };

  const handleMenuClick = (_postId: number) => {
    // Handle menu actions (report, hide, block)
    // This is handled in the individual menu buttons
  };

  const handleHighlightClick = (postId: number) => {
    // Navigate to highlight video or open video player
    navigate(`/highlights/${postId}`);
  };

  const handlePostClick = (postId: number) => {
    // Navigate to detailed post view
    navigate(`/post/${postId}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
        {/* Header Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={() => navigate('/training')}
            className="bg-surface-card/60 border border-surface-border rounded-2xl backdrop-blur-xl p-6 rounded-3xl relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={60} className="text-coral-500" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-coral-400 mb-2">Training Streak</p>
            <h4 className="text-3xl font-black text-white">12 DAYS</h4>
          </button>
          <button
            onClick={() => navigate('/rankings')}
            className="bg-surface-card/60 border border-surface-border rounded-2xl backdrop-blur-xl p-6 rounded-3xl relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy size={60} className="text-green-500" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-green-500 mb-2">Platform Rank</p>
            <h4 className="text-3xl font-black text-white">TOP 5%</h4>
          </button>
          <button
            onClick={() => navigate('/events')}
            className="bg-surface-card/60 border border-surface-border rounded-2xl backdrop-blur-xl p-6 rounded-3xl relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar size={60} className="text-blue-500" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">Next Event</p>
            <h4 className="text-3xl font-black text-white">IN 3 DAYS</h4>
          </button>
        </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Feed */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">The Grid</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setFeedType('recent')}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${
                  feedType === 'recent'
                    ? 'bg-coral-500 text-white'
                    : 'text-ink-muted hover:text-white'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setFeedType('trending')}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${
                  feedType === 'trending'
                    ? 'bg-coral-500 text-white'
                    : 'text-ink-muted hover:text-white'
                }`}
              >
                Trending
              </button>
            </div>
          </div>

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onUserClick={handleUserClick}
              onMenuClick={handleMenuClick}
              onHighlightClick={handleHighlightClick}
              onPostClick={handlePostClick}
            />
          ))}
        </div>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
              <Award size={16} className="text-coral-500" />
              Recommended Drills
            </h3>
            <div className="space-y-4">
              {[
                { id: 1, name: 'Agility Ladder Level 1', duration: '15 mins', level: 'Advanced' },
                { id: 2, name: 'Agility Ladder Level 2', duration: '20 mins', level: 'Expert' },
                { id: 3, name: 'Agility Ladder Level 3', duration: '25 mins', level: 'Elite' }
              ].map((drill) => (
                <button
                  key={drill.id}
                  onClick={() => navigate(`/drills?id=${drill.id}`)}
                  className="w-full flex gap-4 group cursor-pointer text-left"
                >
                  <div className="w-16 h-16 rounded-xl bg-surface border border-white/5 overflow-hidden flex-shrink-0 group-hover:border-coral-500/50 transition-colors">
                    {/* Placeholder image */}
                    <div className="w-full h-full bg-gradient-to-br from-coral-500/20 to-green-500/20 flex items-center justify-center">
                      <PlayCircle size={20} className="text-coral-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase group-hover:text-coral-400 transition-colors">{drill.name}</h4>
                    <p className="text-[10px] text-ink-muted font-bold uppercase mt-1">{drill.duration} • {drill.level}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/drills')}
              className="w-full mt-6 py-3 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-ink-muted hover:text-white hover:bg-white/5 transition-all"
            >
              View All Academy
            </button>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6 bg-coral-500/5 border-coral-500/20">
             <h3 className="text-sm font-black uppercase tracking-widest text-coral-400 mb-4 italic">NIL Compliance</h3>
             <p className="text-xs text-ink-muted leading-relaxed font-medium">
               Make sure your profile information is up to date to remain eligible for upcoming scholarship matches.
             </p>
              <button
                onClick={() => navigate('/audit')}
                className="mt-4 text-[10px] font-black uppercase tracking-widest text-coral-400 hover:text-coral-300 transition-colors"
              >
                 Check Status →
              </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
