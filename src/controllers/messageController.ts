import { Request, Response } from 'express';
import User from '../models/User';

// Simple message interface
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

// In-memory storage for demo (replace with database in production)
const messages: Map<string, Message[]> = new Map();

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id.toString();
    const userMessages = messages.get(userId) || [];
    
    // Get unique conversation partners
    const partnerIds = new Set<string>();
    userMessages.forEach(msg => {
      partnerIds.add(msg.senderId);
      partnerIds.add(msg.receiverId);
    });
    partnerIds.delete(userId);
    
    // Build conversations with partner info
    const conversations = await Promise.all(
      Array.from(partnerIds).map(async (partnerId) => {
        const partner = await User.findById(partnerId).select('username email profilePicture');
        if (!partner) return null;
        
        const partnerMessages = messages.get(partnerId) || [];
        const conversation = [...userMessages, ...partnerMessages]
          .filter(m => 
            (m.senderId === userId && m.receiverId === partnerId) ||
            (m.senderId === partnerId && m.receiverId === userId)
          )
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const unreadCount = userMessages.filter(m => m.senderId === partnerId && !m.read).length;
        
        return {
          user: partner,
          lastMessage: conversation[0] || null,
          unreadCount
        };
      })
    );
    
    res.json(conversations.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id.toString();
    const targetUserId = req.params.userId;
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID required' });
    }
    
    const userMessages = messages.get(userId) || [];
    const targetMessages = messages.get(targetUserId) || [];
    
    const allMessages = [...userMessages, ...targetMessages]
      .filter(m => 
        (m.senderId === userId && m.receiverId === targetUserId) ||
        (m.senderId === targetUserId && m.receiverId === userId)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    res.json(allMessages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id.toString();
    const { toUserId, content } = req.body;
    
    if (!toUserId || !content) {
      return res.status(400).json({ message: 'Recipient and content required' });
    }
    
    const message: Message = {
      id: Date.now().toString(),
      senderId: userId,
      receiverId: toUserId,
      content,
      timestamp: new Date(),
      read: false
    };
    
    // Add to sender's messages
    if (!messages.has(userId)) {
      messages.set(userId, []);
    }
    messages.get(userId)!.push(message);
    
    // Add to receiver's messages
    if (!messages.has(toUserId)) {
      messages.set(toUserId, []);
    }
    messages.get(toUserId)!.push(message);
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id.toString();
    const conversationId = req.params.conversationId;
    
    const userMessages = messages.get(userId) || [];
    let updatedCount = 0;
    
    userMessages.forEach(msg => {
      if (msg.senderId === conversationId && !msg.read) {
        msg.read = true;
        updatedCount++;
      }
    });
    
    res.json({ success: true, updatedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id.toString();
    const messageId = req.params.messageId;
    
    const userMessages = messages.get(userId) || [];
    const filtered = userMessages.filter(msg => msg.id !== messageId);
    messages.set(userId, filtered);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
