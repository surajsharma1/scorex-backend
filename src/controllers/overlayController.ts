import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Overlay from '../models/Overlay';

export const createOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { name, template, config, tournament, match, elements } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Overlay name is required' });
      return;
    }

    if (!template || !template.trim()) {
      res.status(400).json({ message: 'Template is required' });
      return;
    }

    if (!config) {
      res.status(400).json({ message: 'Configuration is required' });
      return;
    }

    const mongoose = require('mongoose');

    const overlayData: any = {
      name: name.trim(),
      template: template.trim(),
      config,
      elements: elements || [],
      publicId: uuidv4(),
      createdBy: user._id,
    };

    if (tournament) {
      if (mongoose.Types.ObjectId.isValid(tournament)) {
        overlayData.tournament = new mongoose.Types.ObjectId(tournament);
      } else {
        res.status(400).json({ message: 'Invalid tournament ID format' });
        return;
      }
    }

    if (match) {
      if (mongoose.Types.ObjectId.isValid(match)) {
        overlayData.match = new mongoose.Types.ObjectId(match);
      } else {
        res.status(400).json({ message: 'Invalid match ID format' });
        return;
      }
    }

    const overlay = await Overlay.create(overlayData);
    
    // Generate the public URL for the overlay - use direct backend URL to avoid Vercel rewrite issues
    const backendUrl = process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
    const publicUrl = `${backendUrl}/overlays/public/${overlay.publicId}`;
    
    // Return the overlay with the public URL
    res.status(201).json({
      ...overlay.toObject(),
      publicUrl
    });
  } catch (error) {
    console.error('Overlay creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlays = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    console.log('[getOverlays] User:', user);
    
    // Return 401 if user is not authenticated instead of silently returning empty array
    if (!user || !user._id) {
      console.log('[getOverlays] No user found or user not authenticated');
      res.status(401).json({ message: 'Not authorized, please log in' });
      return;
    }

    const overlays = await Overlay.find({ createdBy: user._id })
      .populate('tournament')
      .populate('match');
    console.log('[getOverlays] Found overlays:', overlays.length);
    res.json(overlays);
  } catch (error) {
    console.error('Get overlays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findById(req.params.id);
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
    const overlay = await Overlay.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    const overlay = await Overlay.findByIdAndDelete(req.params.id);
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

/**
 * Generate a shareable URL for an overlay
 * This creates a public URL that can be used in OBS or browser sources
 */
export const generateOverlayUrl = (publicId: string, backendUrl?: string): string => {
  // Use direct backend URL to avoid Vercel rewrite issues
  const baseUrl = backendUrl || process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
  return `${baseUrl}/overlays/public/${publicId}`;
};

/**
 * Get all available overlay templates
 */
export const getOverlayTemplates = async (): Promise<Array<{id: string; name: string; description: string}>> => {
  // These should match the templates in the frontend OverlayEditor
  return [
    { id: 'modern', name: 'Modern Minimal', description: 'Clean, modern design with white glass effect and blue accents' },
    { id: 'dark', name: 'Dark Theme', description: 'Sleek dark overlay with vibrant accents for night streaming' },
    { id: 'classic', name: 'Classic Score', description: 'Traditional cricket scoreboard with green background and gold accents' },
    { id: 'minimalist', name: 'Minimalist', description: 'Ultra-clean design focusing on essential score information' },
    { id: 'retro', name: 'Retro Style', description: 'Vintage arcade-style pixelated cricket scoreboard' },
    { id: 'gradient', name: 'Gradient Flow', description: 'Smooth gradient backgrounds with flowing color transitions' },
    { id: 'vintage', name: 'Vintage Cricket', description: 'Old-school cricket board with classic newspaper aesthetics' },
    { id: 'chalkboard', name: 'Chalkboard', description: 'Green chalkboard with handwritten-style scores' },
    { id: 'minimal-dark', name: 'Minimal Dark', description: 'Ultra-minimal dark theme with subtle neon highlights' },
    { id: 'ocean', name: 'Ocean Waves', description: 'Calming ocean waves with blue gradients and sea aesthetics' },
    { id: 'forest', name: 'Forest Green', description: 'Natural forest theme with green tones and leaf patterns' },
    { id: 'sunset', name: 'Sunset Glow', description: 'Warm sunset colors with golden orange gradients' },
    { id: 'desert', name: 'Desert Sands', description: 'Sandy desert theme with warm earth tones and sun effects' },
    { id: 'broadcast', name: 'Broadcast Style', description: 'Professional broadcast-quality overlay with ticker and graphics' },
    { id: 'ipl', name: 'IPL Style', description: 'Indian Premier League inspired design with dynamic animations' },
    { id: 'animated', name: 'Animated Score', description: 'Dynamic overlay with smooth entrance and exit animations' },
    { id: 'neon', name: 'Neon Glow', description: 'Vibrant neon colors with glowing effects and pulse animations' },
    { id: 'metallic', name: 'Metallic Shine', description: 'Shiny metallic overlay with reflections and chrome effects' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'Futuristic cyberpunk style with digital glitches and neon' },
    { id: 'particle', name: 'Particle Effect', description: 'Animated floating particles around the scoreboard' },
    { id: 'holographic', name: 'Holographic', description: '3D holographic projection effect with rainbow reflections' },
    { id: 'fire', name: 'Fire Theme', description: 'Fiery animated background with realistic flame effects' },
    { id: 'space', name: 'Space Theme', description: 'Cosmic space background with stars, planets and nebula' },
    { id: 'crystal', name: 'Crystal Clear', description: 'Crystal-like transparency with prismatic light effects' },
    { id: 'storm', name: 'Storm Clouds', description: 'Dramatic storm clouds with lightning flash effects' },
    { id: 'aurora', name: 'Aurora Borealis', description: 'Northern lights with colorful flowing aurora effects' },
    { id: 'neon2', name: 'Neon Glow 2', description: 'Enhanced neon colors with multiple glow layers' },
    { id: 'glass2', name: 'Glass Morphism 2', description: 'Modern frosted glass design with blur effects' },
    { id: 'wooden2', name: 'Wooden Board 2', description: 'Classic wooden scoreboard with grain textures' },
    { id: 'metallic2', name: 'Metallic Shine 2', description: 'Premium metallic finish with animated reflections' },
    { id: 'cyberpunk2', name: 'Cyberpunk 2', description: 'Advanced cyberpunk with holographic elements' },
  ];
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match') as any;
    
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }

    const templateId = overlay.template || 'modern';
    const matchId = overlay.match?._id || overlay.match;
    const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
    const frontendUrl = process.env.FRONTEND_URL || 'https://scorex-live.vercel.app';
    
    const fs = require('fs');
    const path = require('path');
    
    // Try multiple possible paths for the templates
    const possiblePaths = [
      // Local development paths
      path.resolve(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays'),
      path.resolve(__dirname, '../../scorex-frontend/public/overlays'),
      path.resolve(__dirname, '../../../scorex-frontend/public/overlays'),
      // Production paths - templates served from frontend URL
      path.resolve(__dirname, '../../scorex-frontend/scorex-frontend/public/overlays'),
      path.resolve(process.cwd(), 'scorex-frontend/public/overlays'),
    ];
    
    let templatePath = '';
    let templateFound = false;
    
    for (const overlaysDir of possiblePaths) {
      try {
        const testPath = path.join(overlaysDir, `${templateId}.html`);
        console.log('Checking template at:', testPath);
        if (fs.existsSync(testPath)) {
          templatePath = testPath;
          templateFound = true;
          console.log('Template found at:', templatePath);
          break;
        }
      } catch (e) {
        console.log('Path not accessible:', overlaysDir);
      }
    }
    
    if (templateFound && templatePath) {
      let templateContent = fs.readFileSync(templatePath, 'utf-8');
      
      const injectScript = `
        <script>
          window.OVERLAY_CONFIG = window.OVERLAY_CONFIG || {};
          window.OVERLAY_CONFIG.matchId = '${matchId || ''}';
          window.OVERLAY_CONFIG.apiBaseUrl = '${apiBaseUrl}';
          window.OVERLAY_CONFIG.overlayName = '${overlay.name}';
          window.OVERLAY_CONFIG.publicId = '${overlay.publicId}';
        </script>
      `;
      
      templateContent = templateContent.replace('</body>', `${injectScript}</body>`);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(templateContent);
      return;
    } else {
      // Try to fetch template from frontend URL as fallback
      console.log('Template not found locally, trying frontend URL:', `${frontendUrl}/overlays/${templateId}.html`);
      
      try {
        const axios = require('axios');
        const templateResponse = await axios.get(`${frontendUrl}/overlays/${templateId}.html`, {
          timeout: 5000
        });
        
        let templateContent = templateResponse.data;
        
        const injectScript = `
          <script>
            window.OVERLAY_CONFIG = window.OVERLAY_CONFIG || {};
            window.OVERLAY_CONFIG.matchId = '${matchId || ''}';
            window.OVERLAY_CONFIG.apiBaseUrl = '${apiBaseUrl}';
            window.OVERLAY_CONFIG.overlayName = '${overlay.name}';
            window.OVERLAY_CONFIG.publicId = '${overlay.publicId}';
          </script>
        `;
        
        templateContent = templateContent.replace('</body>', `${injectScript}</body>`);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(templateContent);
        return;
      } catch (fetchError: any) {
        console.log('Failed to fetch template from frontend:', fetchError.message);
      }
      
      // Final fallback - generate a simple overlay with the config
      console.log(`Template not found: ${templateId}, using fallback`);
      
      const Team = require('../models/Team').default;
      const teams = overlay.tournament?._id 
        ? await Team.find({ tournament: overlay.tournament._id }).limit(2) 
        : [];

      const liveScores = overlay.tournament?.liveScores || {};
      const team1 = teams[0] || {};
      const team2 = teams[1] || {};
      
      // Get the background color from overlay config, default to green
      const bgColor = overlay.config?.backgroundColor || '#16a34a';
      const opacity = overlay.config?.opacity || 90;
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${overlay.name}</title>
    <style>
        body { margin: 0; padding: 0; font-family: ${overlay.config?.fontFamily || 'Arial'}, sans-serif; background: transparent; overflow: hidden; }
        .overlay-container { 
            position: absolute; 
            top: 20px; 
            left: 20px; 
            right: 20px; 
            background: ${bgColor}; 
            opacity: ${opacity / 100}; 
            border-radius: 8px; 
            padding: 16px; 
            color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .score-section { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; }
        .team-info { text-align: center; }
        .team-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 4px; }
        .score { font-size: 1.25rem; }
        .overs { font-size: 0.875rem; opacity: 0.8; }
        .vs-text { font-size: 1.125rem; font-weight: bold; color: #fbbf24; }
        .stats-section { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; }
        .stat-item { background: rgba(255, 255, 255, 0.2); padding: 8px; border-radius: 4px; color: white; }
        .stat-label { font-size: 0.75rem; opacity: 0.9; margin-bottom: 2px; }
        .stat-value { font-size: 1rem; font-weight: bold; }
    </style>
    <script>
        // Auto-refresh every 1.5 seconds to get live scores
        setTimeout(() => { window.location.reload(); }, 1500);
        
        // Try to fetch live scores from API
        async function fetchLiveScores() {
            try {
                const response = await fetch('${apiBaseUrl}/matches/${matchId || ''}/live');
                if (response.ok) {
                    const data = await response.json();
                    console.log('Live scores:', data);
                }
            } catch (e) {
                console.log('Could not fetch live scores');
            }
        }
        fetchLiveScores();
    </script>
</head>
<body>
    <div class="overlay-container">
        <div class="score-section">
            <div class="team-info">
                <div class="team-name">${team1?.name || liveScores.team1?.name || 'Team 1'}</div>
                <div class="score">${liveScores.team1?.score || 0}/${liveScores.team1?.wickets || 0}</div>
                <div class="overs">${liveScores.team1?.overs || 0} overs</div>
            </div>
            <div class="vs-text">VS</div>
            <div class="team-info">
                <div class="team-name">${team2?.name || liveScores.team2?.name || 'Team 2'}</div>
                <div class="score">${liveScores.team2?.score || 0}/${liveScores.team2?.wickets || 0}</div>
                <div class="overs">${liveScores.team2?.overs || 0} overs</div>
            </div>
        </div>
        <div class="stats-section">
            <div class="stat-item">
                <div class="stat-label">CRR</div>
                <div class="stat-value">${liveScores.currentRunRate || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">RRR</div>
                <div class="stat-value">${liveScores.requiredRunRate || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Target</div>
                <div class="stat-value">${liveScores.target || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Last 5</div>
                <div class="stat-value">${liveScores.lastFiveOvers || '-'}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
  } catch (error) {
    console.error('Serve overlay error:', error);
    res.status(500).send('Error serving overlay');
  }
};
