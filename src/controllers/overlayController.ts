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
// scorex-backend/src/controllers/overlayController.ts

// Update your getTemplates or getOverlays function to include all designs
export const getOverlayTemplates = async (req: Request, res: Response) => {
  try {
    const templates = [
      { id: 'lvl1-broadcast-bar', name: 'Level 1: Broadcast Bar', url: '/overlays/lvl1-broadcast-bar.html' },
      { id: 'lvl1-curved-compact', name: 'Level 1: Curved Compact', url: '/overlays/lvl1-curved-compact.html' },
      { id: 'lvl1-dark-angular', name: 'Level 1: Dark Angular', url: '/overlays/lvl1-dark-angular.html' },
      { id: 'lvl1-grass-theme', name: 'Level 1: Grass Theme', url: '/overlays/lvl1-grass-theme.html' },
      { id: 'lvl1-high-vis', name: 'Level 1: High Visibility', url: '/overlays/lvl1-high-vis.html' },
      { id: 'lvl1-minimal-dark', name: 'Level 1: Minimal Dark', url: '/overlays/lvl1-minimal-dark.html' },
      { id: 'lvl1-modern-bar', name: 'Level 1: Modern Bar', url: '/overlays/lvl1-modern-bar.html' },
      { id: 'lvl1-modern-blue', name: 'Level 1: Modern Blue', url: '/overlays/lvl1-modern-blue.html' },
      { id: 'lvl1-paper-style', name: 'Level 1: Paper Style', url: '/overlays/lvl1-paper-style.html' },
      { id: 'lvl1-red-card', name: 'Level 1: Red Card', url: '/overlays/lvl1-red-card.html' },
      { id: 'lvl1-retro-board', name: 'Level 1: Retro Board', url: '/overlays/lvl1-retro-board.html' },
      { id: 'lvl1-side-panel', name: 'Level 1: Side Panel', url: '/overlays/lvl1-side-panel.html' },
      { id: 'lvl1-simple-text', name: 'Level 1: Simple Text', url: '/overlays/lvl1-simple-text.html' },
      { id: 'lvl2-broadcast-pro', name: 'Level 2: Broadcast Pro', url: '/overlays/lvl2-broadcast-pro.html' },
      { id: 'lvl2-cosmic-orbit', name: 'Level 2: Cosmic Orbit', url: '/overlays/lvl2-cosmic-orbit.html' },
      { id: 'lvl2-cyber-glitch', name: 'Level 2: Cyber Glitch', url: '/overlays/lvl2-cyber-glitch.html' },
      { id: 'lvl2-flame-thrower', name: 'Level 2: Flame Thrower', url: '/overlays/lvl2-flame-thrower.html' },
      { id: 'lvl2-glass-morphism', name: 'Level 2: Glass Morphism', url: '/overlays/lvl2-glass-morphism.html' },
      { id: 'lvl2-gold-rush', name: 'Level 2: Gold Rush', url: '/overlays/lvl2-gold-rush.html' },
      { id: 'lvl2-hologram', name: 'Level 2: Hologram', url: '/overlays/lvl2-hologram.html' },
      { id: 'lvl2-matrix-rain', name: 'Level 2: Matrix Rain', url: '/overlays/lvl2-matrix-rain.html' },
      { id: 'lvl2-neon-pulse', name: 'Level 2: Neon Pulse', url: '/overlays/lvl2-neon-pulse.html' },
      { id: 'lvl2-particle-storm', name: 'Level 2: Particle Storm', url: '/overlays/lvl2-particle-storm.html' },
      { id: 'lvl2-rgb-split', name: 'Level 2: RGB Split', url: '/overlays/lvl2-rgb-split.html' },
      { id: 'lvl2-speed-racer', name: 'Level 2: Speed Racer', url: '/overlays/lvl2-speed-racer.html' },
      { id: 'lvl2-tech-hud', name: 'Level 2: Tech HUD', url: '/overlays/lvl2-tech-hud.html' },
      { id: 'lvl2-thunder-strike', name: 'Level 2: Thunder Strike', url: '/overlays/lvl2-thunder-strike.html' },
      { id: 'lvl2-vinyl-spin', name: 'Level 2: Vinyl Spin', url: '/overlays/lvl2-vinyl-spin.html' },
      { id: 'lvl2-water-flow', name: 'Level 2: Water Flow', url: '/overlays/lvl2-water-flow.html' }
    ];
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overlays' });
  }
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
