import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Overlay from '../models/Overlay';
import Team from '../models/Team';
import { AuthRequest } from '../middleware/auth';

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
    const baseUrl = process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
    res.json({ 
      publicId: newPublicId,
      url: `${baseUrl}/overlays/public/${newPublicId}` 
    });
  } catch (error) {
    console.error('Error regenerating link:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match');
    
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }
    // --- MEMBERSHIP CHECK START ---
    const owner = await User.findById(overlay.createdBy);
    
    // Check if membership exists and is valid
    if (!owner || !owner.membershipExpiresAt || new Date() > owner.membershipExpiresAt) {
      res.status(403).send(`
        <html>
          <body style="background: #1a1a1a; color: #ff4444; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center; padding: 2rem; border: 1px solid #333; border-radius: 8px;">
              <h1>Broadcast License Expired</h1>
              <p>The membership for this overlay has ended.</p>
              <p>Please contact the organizer to renew.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }
    const templates = await getOverlayTemplates();
    const selectedTemplate = templates.find(t => t.id === overlay.template);
    
    if (selectedTemplate?.level === 2 && owner.membershipLevel < 2) {
       res.status(403).send("Upgrade to Level 2 Membership to use animated overlays.");
       return;
    }
    const socketScript = `
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io('${process.env.API_BASE_URL}');
        const matchId = '${overlay.match?._id || ""}';
        
        socket.on('connect', () => {
          console.log('Connected to ScoreX Live');
          if(matchId) socket.emit('join_match', matchId);
        });

        socket.on('match_update', (data) => {
          if (window.updateOverlay) window.updateOverlay(data);
          
          // Handle Push Notifications (Level 2 Only)
          if (data.notification && ${owner.membershipLevel} >= 2) {
             if (window.showNotification) window.showNotification(data.notification);
          }
        });
      </script>
    `;
    
    // Send final HTML with socket script injected
    // ...
  } catch (error) {
    // ...
  }
};

const getBaseUrl = (): string => {
  return process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
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

export const getOverlayTemplates = async (): Promise<Array<{id: string; name: string; description: string}>> => {
  return [
    { id: 'vintage.html', name: 'Vintage Cricket', description: 'Old-school cricket board' },
    { id: 'gate-minimal-dark.html', name: 'Minimal Dark', description: 'Ultra-minimal dark theme' },
    { id: 'slate-gold-ashes.html', name: 'Slate Gold', description: 'Dark slate with gold accents' },
    { id: 'minimalist-split-bar.html', name: 'Minimalist Split', description: 'Split bar design' },
    { id: 'gradient-monolith.html', name: 'Gradient Monolith', description: 'Smooth gradient backgrounds' },
    { id: 'neon-vector-replay.html', name: 'Neon Vector', description: 'Vibrant neon vector style' },
    { id: 'circuit-node-neon.html', name: 'Circuit Node', description: 'Futuristic circuit board' },
    { id: 'cyber-shield.html', name: 'Cyber Shield', description: 'Cyberpunk shield design' },
    { id: 'hex-perimeter.html', name: 'Hex Perimeter', description: 'Hexagonal pattern' },
    { id: 'modern-monolith-slab.html', name: 'Modern Monolith', description: 'Modern slab design' },
    { id: 'aurora-glass-bbl.html', name: 'Aurora Glass', description: 'Glass morphism effect' },
    { id: 'orbital-overlay.html', name: 'Orbital', description: 'Rotating orbital elements' },
    { id: 'fragment-overlay.html', name: 'Fragment', description: 'Modern fragmented design' },
    { id: 'aether-overlay.html', name: 'Aether', description: 'Ethereal aesthetic' },
    { id: 'vector-overlay.html', name: 'Vector', description: 'Clean vector design' },
    { id: 'zenith-overlay.html', name: 'Zenith', description: 'Peak design style' },
    { id: 'obsidian-overlay.html', name: 'Obsidian', description: 'Dark stone aesthetic' },
    { id: 'vanguard-overlay.html', name: 'Vanguard', description: 'Bold leading edge' },
    { id: 'fractal-overlay.html', name: 'Fractal', description: 'Mathematical patterns' },
    { id: 'glitch-overlay.html', name: 'Glitch', description: 'Digital glitch art' },
    { id: 'titan-overlay.html', name: 'Titan', description: 'Massive powerful design' },
    { id: 'prism-overlay.html', name: 'Prism', description: 'Light refracting effect' },
    { id: 'octane-overlay.html', name: 'Octane', description: 'High speed racing style' },
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
      } catch (err) {
        console.error('Failed to fetch template from frontend:', err);
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