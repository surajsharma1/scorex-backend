import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Overlay from '../models/Overlay';
import Team from '../models/Team';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

const getBaseUrl = (): string => {
  return process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
};

export const regenerateOverlayUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    // Generate a secure random UUID
    const newPublicId = uuidv4();
    const overlay = await Overlay.findOneAndUpdate(
      { _id: req.params.id, createdBy: user._id },
      { publicId: newPublicId },
      { new: true }
    );

    if (!overlay) {
      res.status(404).json({ message: 'Overlay not found' });
      return;
    }
    const baseUrl = getBaseUrl();
    res.json({ 
      publicId: newPublicId,
      url: `${baseUrl}/overlays/public/${newPublicId}` 
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

    const { name, template, config, tournament, match, elements } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Overlay name is required' });
      return;
    }

    if (!template?.trim()) {
      res.status(400).json({ message: 'Template is required' });
      return;
    }

    const overlayData: any = {
      name: name.trim(),
      template: template.trim(),
      config: config || {},
      elements: elements || [],
      publicId: uuidv4(),
      createdBy: user._id,
    };

    if (tournament && mongoose.Types.ObjectId.isValid(tournament)) {
      overlayData.tournament = new mongoose.Types.ObjectId(tournament);
    }

    if (match && mongoose.Types.ObjectId.isValid(match)) {
      overlayData.match = new mongoose.Types.ObjectId(match);
    }

    const overlay = await Overlay.create(overlayData);
    
    const templateName = overlay.template;
    const publicUrl = `${getBaseUrl()}/overlays/public/${overlay.publicId}?template=${templateName}`;
    
    res.status(201).json({
      ...overlay.toObject(),
      publicUrl,
      templateName
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

    const overlays = await Overlay.find({ createdBy: user._id })
      .populate('tournament', 'name')
      .populate('match');
      
    res.json(overlays);
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

export const getOverlayTemplates = async () => {
  return [
    // --- LEVEL 1: STATIC (Basic Designs) ---
    { id: 'lvl1-classic.html', name: 'Classic Test', level: 1, description: 'Traditional white/red design' },
    { id: 'lvl1-modern-blue.html', name: 'Modern Blue', level: 1, description: 'Clean blue header style' },
    { id: 'lvl1-minimal-dark.html', name: 'Dark Minimal', level: 1, description: 'High contrast dark mode' },
    { id: 'lvl1-broadcast-bar.html', name: 'Bottom Bar', level: 1, description: 'Standard TV broadcast bottom bar' },
    { id: 'lvl1-side-panel.html', name: 'Side Panel', level: 1, description: 'Vertical side panel stats' },
    { id: 'lvl1-retro-board.html', name: 'Retro Board', level: 1, description: '90s style digital board' },
    { id: 'lvl1-paper-style.html', name: 'Paper Score', level: 1, description: 'Paper texture background' },
    { id: 'lvl1-high-vis.html', name: 'High Vis', level: 1, description: 'Yellow/Black high visibility' },
    { id: 'lvl1-clean-slate.html', name: 'Clean Slate', level: 1, description: 'Grey and white professional' },
    { id: 'lvl1-box-score.html', name: 'Box Score', level: 1, description: 'Compact box design' },
    { id: 'lvl1-red-card.html', name: 'Red Card', level: 1, description: 'Bold red team focus' },
    { id: 'lvl1-grass-theme.html', name: 'Grass Roots', level: 1, description: 'Green texture theme' },
    { id: 'lvl1-simple-text.html', name: 'Text Only', level: 1, description: 'Just the facts' },

    // --- LEVEL 2: ANIMATED (Premium Designs with Notifications) ---
    { id: 'lvl2-neon-pulse.html', name: 'Neon Pulse', level: 2, type: 'animated', description: 'Glowing neon edges with pulse' },
    { id: 'lvl2-cyber-glitch.html', name: 'Cyber Glitch', level: 2, type: 'animated', description: 'Cyberpunk glitch effects on score change' },
    { id: 'lvl2-gold-rush.html', name: 'Gold Rush', level: 2, type: 'animated', description: 'Golden particle effects' },
    { id: 'lvl2-flame-thrower.html', name: 'Flame Thrower', level: 2, type: 'animated', description: 'Fire animations on boundaries' },
    { id: 'lvl2-water-flow.html', name: 'Aqua Flow', level: 2, type: 'animated', description: 'Fluid liquid background' },
    { id: 'lvl2-tech-hud.html', name: 'Sci-Fi HUD', level: 2, type: 'animated', description: 'Iron Man style HUD interface' },
    { id: 'lvl2-glass-morphism.html', name: 'Glass Motion', level: 2, type: 'animated', description: 'Frosted glass with moving gradients' },
    { id: 'lvl2-speed-racer.html', name: 'Speed Racer', level: 2, type: 'animated', description: 'Fast sliding animations' },
    { id: 'lvl2-thunder-strike.html', name: 'Thunder', level: 2, type: 'animated', description: 'Lightning effects on wickets' },
    { id: 'lvl2-cosmic-orbit.html', name: 'Cosmic', level: 2, type: 'animated', description: 'Rotating celestial bodies' },
    { id: 'lvl2-matrix-rain.html', name: 'The Matrix', level: 2, type: 'animated', description: 'Digital code rain background' },
    { id: 'lvl2-vinyl-spin.html', name: 'Vinyl', level: 2, type: 'animated', description: 'Spinning record style' },
    { id: 'lvl2-broadcast-pro.html', name: 'ESPN Style', level: 2, type: 'animated', description: 'Professional TV animations' },
    { id: 'lvl2-particle-storm.html', name: 'Particles', level: 2, type: 'animated', description: 'Exploding particles on 6s' },
    { id: 'lvl2-hologram.html', name: 'Hologram', level: 2, type: 'animated', description: '3D Holographic projection effect' },
    { id: 'lvl2-rgb-split.html', name: 'RGB Split', level: 2, type: 'animated', description: 'Chromatic aberration effects' },
  ];
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateFromQuery = req.query.template as string;
    
    // Find overlay and populate necessary data
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match');
    
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }

    const templateId = templateFromQuery || overlay.template || 'modern.html';
    // Ensure template ends with .html
    const templateFile = templateId.endsWith('.html') ? templateId : `${templateId}.html`;

    const matchId = (overlay.match as any)?._id || overlay.match;
    const apiBaseUrl = getBaseUrl();
    const frontendUrl = process.env.FRONTEND_URL || 'https://scorex-live.vercel.app';
    
    // Paths to check for templates
    const possiblePaths = [
      path.resolve(__dirname, '../../public/overlays'), // Prod structure often dist/../public
      path.resolve(__dirname, '../../../public/overlays'), // Local dev
      path.resolve(process.cwd(), 'public/overlays'), // Root execution
      path.resolve(process.cwd(), 'scorex-frontend/public/overlays') // Monorepo style
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
        // 3. Fallback to basic HTML if all else fails
        templateContent = `
          <html>
            <body style="background: ${overlay.config?.backgroundColor || '#000'}; color: white; font-family: sans-serif;">
              <h1>Error loading template</h1>
              <p>Could not load template: ${templateFile}</p>
            </body>
          </html>`;
      }
    }

    // Inject Configuration
    const injectScript = `
      <script>
        window.OVERLAY_CONFIG = {
          matchId: '${matchId || ''}',
          apiBaseUrl: '${apiBaseUrl}',
          overlayName: '${overlay.name}',
          publicId: '${overlay.publicId}',
          config: ${JSON.stringify(overlay.config || {})}
        };
      </script>
    `;
    
    const finalHtml = templateContent.includes('</body>') 
      ? templateContent.replace('</body>', `${injectScript}</body>`)
      : templateContent + injectScript;

    res.setHeader('Content-Type', 'text/html');
    res.send(finalHtml);

  } catch (error) {
    console.error('Serve overlay error:', error);
    res.status(500).send('Error serving overlay');
  }
};
