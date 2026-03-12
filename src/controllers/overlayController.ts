import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Overlay from '../models/Overlay';
import Match from '../models/Match';
import Team from '../models/Team';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

const getBaseUrl = (): string => {
  return process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
};

// Helper function to check if user has valid membership
const checkUserMembership = async (userId: mongoose.Types.ObjectId): Promise<{ hasMembership: boolean; level: number; isAdmin: boolean }> => {
  const user = await User.findById(userId).select('role membershipLevel membershipExpiresAt');
  
  if (!user) {
    return { hasMembership: false, level: 0, isAdmin: false };
  }
  
  const isAdmin = user.role === 'admin';
  
  // Admins always have Premium LV2 permanently
  if (isAdmin) {
    return { hasMembership: true, level: 2, isAdmin: true };
  }
  
  // Check membership level and expiration
  const membershipLevel = user.membershipLevel || 0;
  const membershipExpiresAt = user.membershipExpiresAt;
  
  // If no expiration date or still valid, membership is active
  if (membershipExpiresAt && new Date() > membershipExpiresAt) {
    // Membership expired
    return { hasMembership: false, level: 0, isAdmin: false };
  }
  
  return { 
    hasMembership: membershipLevel > 0, 
    level: membershipLevel,
    isAdmin: false 
  };
};

// URL expiry duration in milliseconds (24 hours)
const URL_EXPIRY_DURATION = 24 * 60 * 60 * 1000;

export const regenerateOverlayUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    // Generate a secure random UUID
    const newPublicId = uuidv4();
    // Set new expiry time (24 hours from now)
    const newExpiry = new Date(Date.now() + URL_EXPIRY_DURATION);
    
    const overlay = await Overlay.findOneAndUpdate(
      { _id: req.params.id, createdBy: user._id },
      { 
        publicId: newPublicId,
        urlExpiresAt: newExpiry
      },
      { new: true }
    );

    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    const baseUrl = getBaseUrl();
    const publicUrl = `${baseUrl}/overlays/public/${newPublicId}?template=${overlay.template}`;
    res.json({ 
      publicId: newPublicId,
      url: publicUrl,
      urlExpiresAt: newExpiry,
      publicUrl
    });
  } catch (error) {
    console.error('Error regenerating link:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Check user's membership status
    const membership = await checkUserMembership(user._id);
    
    // If not admin and no membership, deny access
    if (!membership.hasMembership && !membership.isAdmin) {
      res.status(403).json({ 
        message: 'Premium membership required to create overlays',
        requiresMembership: true,
        currentLevel: membership.level
      });
      return;
    }

    const { name, template, config, tournament, match, elements, requiredMembershipLevel } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Overlay name is required' });
      return;
    }

    if (!template?.trim()) {
      res.status(400).json({ message: 'Template is required' });
      return;
    }

    // Determine required membership level (default to user's current level)
    const membershipLevel = requiredMembershipLevel || membership.level;

const overlayData: any = {
      name: name.trim(),
      template: template.trim(),
      config: config || {},
      elements: elements || [],
      publicId: uuidv4(),
      createdBy: user._id,
      requiredMembershipLevel: membershipLevel, // Store the required membership level
      membershipAtCreation: membership.level, // Store membership level at creation
      urlExpiresAt: new Date(Date.now() + URL_EXPIRY_DURATION) // Set URL expiry to 24 hours
    };

    if (tournament && mongoose.Types.ObjectId.isValid(tournament)) {
      overlayData.tournament = new mongoose.Types.ObjectId(tournament);
    }

    if (match && mongoose.Types.ObjectId.isValid(match)) {
      overlayData.match = new mongoose.Types.ObjectId(match);
    }

    const overlay = await Overlay.create(overlayData);
    
    // Update the Match's overlayId if a match was specified
    if (match && mongoose.Types.ObjectId.isValid(match)) {
      try {
        await Match.findByIdAndUpdate(match, { overlayId: overlay._id });
      } catch (err) {
        console.error('Error updating match with overlayId:', err);
      }
    }
    
    const templateName = overlay.template;
    const baseUrl = getBaseUrl();
    const publicUrl = `${baseUrl}/overlays/public/${overlay.publicId}?template=${templateName}`;
    
    res.status(201).json({
      ...overlay.toObject(),
      publicUrl,
      templateName,
      urlExpiresAt: overlay.urlExpiresAt
    });
  } catch (error) {
    console.error('Overlay creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlays = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user._id) {
      res.status(401).json({ message: 'Not authorized, please log in' });
      return;
    }

    // Check membership for user
    const membership = await checkUserMembership(user._id);
    
    const overlays = await Overlay.find({ createdBy: user._id })
      .populate('tournament', 'name')
      .populate({ path: 'match', populate: [
        { path: 'team1', select: 'name shortName' },
        { path: 'team2', select: 'name shortName' }
      ]});
      
    // Add membership status to each overlay
    const overlaysWithMembership = overlays.map(overlay => ({
      ...overlay.toObject(),
      isMembershipValid: membership.hasMembership || membership.isAdmin,
      currentMembershipLevel: membership.level,
      isAdmin: membership.isAdmin
    }));
    
    res.json(overlaysWithMembership);
  } catch (error) {
    console.error('Get overlays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const overlay = await Overlay.findOne({ _id: req.params.id, createdBy: user._id });
    
    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    
    res.json(overlay);
  } catch (error) {
    console.error('Get overlay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const overlay = await Overlay.findOneAndUpdate(
      { _id: req.params.id, createdBy: user._id },
      req.body,
      { new: true }
    );

    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    res.json(overlay);
  } catch (error) {
    console.error('Update overlay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const overlay = await Overlay.findOneAndDelete({ _id: req.params.id, createdBy: user._id });
    
    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    res.json({ message: 'Overlay deleted' });
  } catch (error) {
    console.error('Delete overlay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all available overlay templates
export const getOverlayTemplates = async (req: Request, res: Response) => {
  try {
    const templates = [
      { id: 'lvl1-broadcast-bar', name: 'Level 1: Broadcast Bar', url: '/overlays/lvl1-broadcast-bar.html', level: 1 },
      { id: 'lvl1-curved-compact', name: 'Level 1: Curved Compact', url: '/overlays/lvl1-curved-compact.html', level: 1 },
      { id: 'lvl1-dark-angular', name: 'Level 1: Dark Angular', url: '/overlays/lvl1-dark-angular.html', level: 1 },
      { id: 'lvl1-grass-theme', name: 'Level 1: Grass Theme', url: '/overlays/lvl1-grass-theme.html', level: 1 },
      { id: 'lvl1-high-vis', name: 'Level 1: High Visibility', url: '/overlays/lvl1-high-vis.html', level: 1 },
      { id: 'lvl1-minimal-dark', name: 'Level 1: Minimal Dark', url: '/overlays/lvl1-minimal-dark.html', level: 1 },
      { id: 'lvl1-modern-bar', name: 'Level 1: Modern Bar', url: '/overlays/lvl1-modern-bar.html', level: 1 },
      { id: 'lvl1-modern-blue', name: 'Level 1: Modern Blue', url: '/overlays/lvl1-modern-blue.html', level: 1 },
      { id: 'lvl1-paper-style', name: 'Level 1: Paper Style', url: '/overlays/lvl1-paper-style.html', level: 1 },
      { id: 'lvl1-red-card', name: 'Level 1: Red Card', url: '/overlays/lvl1-red-card.html', level: 1 },
      { id: 'lvl1-retro-board', name: 'Level 1: Retro Board', url: '/overlays/lvl1-retro-board.html', level: 1 },
      { id: 'lvl1-side-panel', name: 'Level 1: Side Panel', url: '/overlays/lvl1-side-panel.html', level: 1 },
      { id: 'lvl1-simple-text', name: 'Level 1: Simple Text', url: '/overlays/lvl1-simple-text.html', level: 1 },
      { id: 'lvl2-broadcast-pro', name: 'Level 2: Broadcast Pro', url: '/overlays/lvl2-broadcast-pro.html', level: 2 },
      { id: 'lvl2-cosmic-orbit', name: 'Level 2: Cosmic Orbit', url: '/overlays/lvl2-cosmic-orbit.html', level: 2 },
      { id: 'lvl2-cyber-glitch', name: 'Level 2: Cyber Glitch', url: '/overlays/lvl2-cyber-glitch.html', level: 2 },
      { id: 'lvl2-flame-thrower', name: 'Level 2: Flame Thrower', url: '/overlays/lvl2-flame-thrower.html', level: 2 },
      { id: 'lvl2-glass-morphism', name: 'Level 2: Glass Morphism', url: '/overlays/lvl2-glass-morphism.html', level: 2 },
      { id: 'lvl2-gold-rush', name: 'Level 2: Gold Rush', url: '/overlays/lvl2-gold-rush.html', level: 2 },
      { id: 'lvl2-hologram', name: 'Level 2: Hologram', url: '/overlays/lvl2-hologram.html', level: 2 },
      { id: 'lvl2-matrix-rain', name: 'Level 2: Matrix Rain', url: '/overlays/lvl2-matrix-rain.html', level: 2 },
      { id: 'lvl2-neon-pulse', name: 'Level 2: Neon Pulse', url: '/overlays/lvl2-neon-pulse.html', level: 2 },
      { id: 'lvl2-particle-storm', name: 'Level 2: Particle Storm', url: '/overlays/lvl2-particle-storm.html', level: 2 },
      { id: 'lvl2-rgb-split', name: 'Level 2: RGB Split', url: '/overlays/lvl2-rgb-split.html', level: 2 },
      { id: 'lvl2-speed-racer', name: 'Level 2: Speed Racer', url: '/overlays/lvl2-speed-racer.html', level: 2 },
      { id: 'lvl2-tech-hud', name: 'Level 2: Tech HUD', url: '/overlays/lvl2-tech-hud.html', level: 2 },
      { id: 'lvl2-thunder-strike', name: 'Level 2: Thunder Strike', url: '/overlays/lvl2-thunder-strike.html', level: 2 },
      { id: 'lvl2-vinyl-spin', name: 'Level 2: Vinyl Spin', url: '/overlays/lvl2-vinyl-spin.html', level: 2 },
      { id: 'lvl2-water-flow', name: 'Level 2: Water Flow', url: '/overlays/lvl2-water-flow.html', level: 2 }
    ];
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overlays' });
  }
};

// Get user's current membership status
export const getMembershipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const membership = await checkUserMembership(user._id);
    
    res.json({
      hasMembership: membership.hasMembership,
      level: membership.level,
      isAdmin: membership.isAdmin,
      message: membership.isAdmin 
        ? 'Admin users have permanent Premium LV2 access'
        : membership.hasMembership 
          ? `You have Premium Level ${membership.level} access`
          : 'Premium membership required'
    });
  } catch (error) {
    console.error('Error checking membership:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateFromQuery = req.query.template as string;
    
    // Find overlay and populate necessary data
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match')
      .populate('createdBy', 'role membershipLevel membershipExpiresAt');
    
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }

    // Check if user has valid membership to access this overlay
    const authHeader = req.headers.authorization;
    let userMembership = { hasMembership: false, level: 0, isAdmin: false };
    
    if (authHeader) {
      try {
        // Try to get user from token if provided
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload._id) {
          userMembership = await checkUserMembership(new mongoose.Types.ObjectId(payload._id));
        }
      } catch (e) {
        // Invalid token, continue without user
      }
    }

    // If user doesn't have valid membership and overlay requires membership
    if (!userMembership.hasMembership && !userMembership.isAdmin) {
      // Check if this overlay requires membership (membershipAtCreation > 0)
      if (overlay.membershipAtCreation > 0) {
        res.status(403).send(`
          <html>
            <head>
              <title>Membership Required</title>
              <style>
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                  color: white;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                }
                .container { 
                  text-align: center; 
                  padding: 40px;
                  background: rgba(255,255,255,0.1);
                  border-radius: 20px;
                  backdrop-filter: blur(10px);
                }
                h1 { color: #ff6b6b; margin-bottom: 20px; }
                p { margin-bottom: 30px; font-size: 18px; }
                a { 
                  background: #4ecdc4; 
                  color: #1a1a2e; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  border-radius: 30px;
                  font-weight: bold;
                  transition: transform 0.2s;
                }
                a:hover { transform: scale(1.05); }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🔒 Membership Required</h1>
                <p>This overlay was created with Premium membership and is no longer accessible.<br>Please renew your membership to continue using it.</p>
                <a href="${process.env.FRONTEND_URL || 'https://scorex-live.vercel.app'}/membership">Upgrade Now</a>
              </div>
            </body>
          </html>
        `);
        return;
      }
    }

    const templateId = templateFromQuery || overlay.template || 'modern.html';
    // Ensure template ends with .html
    const templateFile = templateId.endsWith('.html') ? templateId : `${templateId}.html`;

    const matchId = (overlay.match as any)?._id || overlay.match;
    const apiBaseUrl = getBaseUrl();
    const frontendUrl = process.env.FRONTEND_URL || 'https://scorex-live.vercel.app';
    
    // Paths to check for templates (local backend path first, then fallbacks)
    const possiblePaths = [
      path.resolve(process.cwd(), 'public/overlays'),          // backend root/public/overlays
      path.resolve(__dirname, '../public/overlays'),             // dist/../public/overlays  
      path.resolve(__dirname, '../../public/overlays'),          // src/../public/overlays
      path.resolve(process.cwd(), 'scorex-frontend/public/overlays'),
      path.resolve(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays')
    ];
    
    let templateContent = '';
    let foundLocally = false;

    // 1. Try Local File System
    for (const overlaysDir of possiblePaths) {
      const testPath = path.join(overlaysDir, templateFile);
      if (fs.existsSync(testPath)) {
        templateContent = fs.readFileSync(testPath, 'utf-8');
        foundLocally = true;
        break;
      }
    }

    // 2. Try Fetching from Frontend (Fallback)
    if (!foundLocally) {
      const templateUrl = `${frontendUrl}/overlays/${templateFile}`;
      console.log(`Template not found locally, fetching from: ${templateUrl}`);
      
      try {
        const templateResponse = await axios.get(templateUrl, { 
          timeout: 5000,
          responseType: 'text' 
        });
        templateContent = templateResponse.data;
      } catch (err: any) {
        console.error('Failed to fetch template from frontend:', err.message);
        templateContent = `
          <html>
            <body style="background: ${overlay.config?.backgroundColor || '#000'}; color: white; font-family: sans-serif;">
              <h1>Error loading template</h1>
              <p>Could not load template: ${templateFile}</p>
            </body>
          </html>`;
      }
    }

    // Inject Configuration and Socket.io client
    const socketIoUrl = `${apiBaseUrl.replace('/api/v1', '')}/socket.io/socket.io.js`;
    const injectScript = `
      <!-- Socket.io client -->
      <script src="${socketIoUrl}"></script>
      <script>
        window.OVERLAY_CONFIG = {
          matchId: '${matchId || ''}',
          apiBaseUrl: '${apiBaseUrl}',
          overlayName: '${overlay.name}',
          publicId: '${overlay.publicId}',
          config: ${JSON.stringify(overlay.config || {})},
          membershipStatus: {
            level: ${userMembership.level},
            isAdmin: ${userMembership.isAdmin},
            hasAccess: ${userMembership.hasMembership || userMembership.isAdmin}
          }
        };
      </script>
      <!-- Overlay Engine -->
      <script src="/overlays/engine.js"></script>
    `;
    
    let finalHtml = templateContent;
    
    // Inject socket.io and engine.js before </body> or at the end
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `${injectScript}</body>`);
    } else if (finalHtml.includes('</head>')) {
      finalHtml = finalHtml.replace('</head>', `${injectScript}</head>`);
    } else {
      finalHtml = finalHtml + injectScript;
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(finalHtml);

  } catch (error) {
    console.error('Serve overlay error:', error);
    res.status(500).send('Error serving overlay');
  }
};