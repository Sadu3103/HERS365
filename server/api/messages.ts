import express from 'express';

const router = express.Router();

// Mock data for conversations and messages
const mockConversations = [
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
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
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
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      isFromMe: true,
      isRead: true
    },
    unreadCount: 0
  }
];

const mockMessages: { [conversationId: number]: any[] } = {
  1: [
    {
      id: 1,
      text: 'Hi! I saw your profile and was impressed by your stats.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isFromMe: false,
      isRead: true,
      type: 'text'
    },
    {
      id: 2,
      text: 'Thank you! I\'ve been working really hard on my training.',
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      isFromMe: true,
      isRead: true,
      type: 'text'
    },
    {
      id: 3,
      text: 'That shows. Your 40-yard dash time is excellent for a QB.',
      timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      isFromMe: false,
      isRead: true,
      type: 'text'
    },
    {
      id: 4,
      text: 'Thanks! Coach has been helping me with speed training.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isFromMe: true,
      isRead: true,
      type: 'text'
    },
    {
      id: 5,
      text: 'Great game last Friday! Your performance was outstanding.',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      isFromMe: false,
      isRead: false,
      type: 'text'
    }
  ],
  2: [
    {
      id: 6,
      text: 'Hey Sarah! How\'s your training going?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isFromMe: true,
      isRead: true,
      type: 'text'
    },
    {
      id: 7,
      text: 'Going great! Just finished QB fundamentals training.',
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      isFromMe: false,
      isRead: true,
      type: 'text'
    },
    {
      id: 8,
      text: 'Thanks for the feedback on my QB mechanics!',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      isFromMe: true,
      isRead: true,
      type: 'text'
    }
  ]
};

// GET /api/messages/conversations - Get all user conversations
router.get('/conversations', (req, res) => {
  try {
    const { search } = req.query;

    let filteredConversations = [...mockConversations];

    if (search) {
      const searchLower = search.toString().toLowerCase();
      filteredConversations = filteredConversations.filter(conv =>
        conv.participant.name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: filteredConversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

// GET /api/messages/conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const conversationId = parseInt(id);

    if (!mockMessages[conversationId]) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const { limit = 50, offset = 0 } = req.query;
    const messages = mockMessages[conversationId]
      .slice(Number(offset), Number(offset) + Number(limit))
      .reverse(); // Most recent first

    res.json({
      success: true,
      data: messages,
      pagination: {
        total: mockMessages[conversationId].length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// POST /api/messages - Send a new message
router.post('/', (req, res) => {
  try {
    const { conversationId, text, type = 'text' } = req.body;

    if (!conversationId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and text are required'
      });
    }

    if (!mockMessages[conversationId]) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const newMessage = {
      id: Date.now(),
      text,
      timestamp: new Date().toISOString(),
      isFromMe: true,
      isRead: true,
      type
    };

    mockMessages[conversationId].push(newMessage);

    // Update conversation's last message
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.lastMessage = {
        text: newMessage.text,
        timestamp: newMessage.timestamp,
        isFromMe: true,
        isRead: true
      };
    }

    res.json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// PUT /api/messages/read - Mark messages as read
router.put('/read', (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }

    if (!mockMessages[conversationId]) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Mark all messages in conversation as read
    mockMessages[conversationId].forEach(message => {
      if (!message.isFromMe) {
        message.isRead = true;
      }
    });

    // Update conversation unread count
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
      conversation.lastMessage.isRead = true;
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// GET /api/messages/unread-count - Get total unread message count
router.get('/unread-count', (req, res) => {
  try {
    const totalUnread = mockConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

    res.json({
      success: true,
      data: {
        totalUnread,
        conversations: mockConversations.map(conv => ({
          id: conv.id,
          unreadCount: conv.unreadCount
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// POST /api/messages/conversations - Start a new conversation
router.post('/conversations', (req, res) => {
  try {
    const { participantId, initialMessage } = req.body;

    if (!participantId || !initialMessage) {
      return res.status(400).json({
        success: false,
        error: 'Participant ID and initial message are required'
      });
    }

    const newConversationId = Math.max(...mockConversations.map(c => c.id)) + 1;

    // Mock participant data (in real app, fetch from users API)
    const newConversation = {
      id: newConversationId,
      participant: {
        name: 'New Contact',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=New',
        role: 'athlete',
        isOnline: false
      },
      lastMessage: {
        text: initialMessage,
        timestamp: new Date().toISOString(),
        isFromMe: true,
        isRead: true
      },
      unreadCount: 0
    };

    mockConversations.push(newConversation);
    mockMessages[newConversationId] = [{
      id: Date.now(),
      text: initialMessage,
      timestamp: new Date().toISOString(),
      isFromMe: true,
      isRead: true,
      type: 'text'
    }];

    res.json({
      success: true,
      data: newConversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

export { router as messagesRouter };