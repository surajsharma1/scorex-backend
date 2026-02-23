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
    // Include the template name in the URL so it's clear which overlay file is being used
    const backendUrl = process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';
    const templateName = overlay.template || 'modern';
    const publicUrl = `${backendUrl}/overlays/public/${overlay.publicId}?template=${templateName}`;
    
    // Return the overlay with the public URL
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
    const user = (req as any).user;
    
    // Return 401 if user is not authenticated
    if (!user || !user._id) {
      res.status(401).json({ message: 'Not authorized, please log in' });
      return;
    }

    // Find overlay and verify ownership
    const overlay = await Overlay.findOne({
      _id: req.params.id,
      createdBy: user._id
    });
    
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
 * Updated to match actual files in /public/overlays/
 */
export const getOverlayTemplates = async (): Promise<Array<{id: string; name: string; description: string}>> => {
  // These match the actual template files in scorex-frontend/public/overlays/
  return [
    // Free templates
    { id: 'vintage.html', name: 'Vintage Cricket', description: 'Old-school cricket board with classic newspaper aesthetics' },
    { id: 'gate-minimal-dark.html', name: 'Minimal Dark', description: 'Ultra-minimal dark theme with subtle neon highlights' },
    { id: 'slate-gold-ashes.html', name: 'Slate Gold', description: 'Dark slate with gold accents for premium look' },
    { id: 'minimalist-split-bar.html', name: 'Minimalist Split', description: 'Ultra-clean split bar design focusing on essential score' },
    // Premium Basic
    { id: 'gradient-monolith.html', name: 'Gradient Monolith', description: 'Smooth gradient backgrounds with flowing color transitions' },
    { id: 'neon-vector-replay.html', name: 'Neon Vector', description: 'Vibrant neon vector style with glowing effects' },
    { id: 'circuit-node-neon.html', name: 'Circuit Node', description: 'Futuristic circuit board design with neon accents' },
    { id: 'cyber-shield.html', name: 'Cyber Shield', description: 'Futuristic cyberpunk shield design' },
    { id: 'hex-perimeter.html', name: 'Hex Perimeter', description: 'Hexagonal pattern with modern aesthetics' },
    { id: 'grid-sunset-red.html', name: 'Grid Sunset', description: 'Warm sunset colors with grid pattern' },
    { id: 'titan-perimeter.html', name: 'Titan Perimeter', description: 'Bold titan design with strong perimeter lines' },
    { id: 'prism-pop-desert.html', name: 'Prism Pop', description: 'Colorful prism effect with vibrant pops' },
    { id: 'modern-monolith-slab.html', name: 'Modern Monolith', description: 'Modern slab design with clean lines' },
    // Premium Designer
    { id: 'apex-cradle-gold.html', name: 'Apex Cradle Gold', description: 'Premium apex design with gold accents' },
    { id: 'aurora-glass-bbl.html', name: 'Aurora Glass BBL', description: 'Aurora borealis effect with glass morphism' },
    { id: 'mono-cyberpunk.html', name: 'Mono Cyberpunk', description: 'Monochrome cyberpunk style' },
    { id: 'storm-flare-rail.html', name: 'Storm Flare', description: 'Dramatic storm clouds with flare effects' },
    { id: 'titanium-dark-ribbon.html', name: 'Titanium Dark', description: 'Premium titanium finish with dark theme' },
    { id: 'retro-glitch-hud.html', name: 'Retro Glitch HUD', description: 'Retro arcade style with glitch effects' },
    { id: 'wooden2.html', name: 'Wooden Board', description: 'Classic wooden scoreboard with grain textures' },
    { id: 'interceptor-orange.html', name: 'Interceptor Orange', description: 'Bold orange interceptor design' },
    { id: 'metallic-eclipse-lens.html', name: 'Metallic Eclipse', description: 'Metallic eclipse lens effect' },
    { id: 'red-spine-replay.html', name: 'Red Spine Replay', description: 'Bold red spine design for replays' },
    { id: 'Double-Rail-Broadcast.html', name: 'Double Rail Broadcast', description: 'Professional broadcast style with dual rails' },
    { id: 'rail-world-broadcast.html', name: 'Rail World', description: 'World broadcast rail design' },
    { id: 'news-ticker-broadcast.html', name: 'News Ticker Broadcast', description: 'News ticker style broadcast overlay' },
    { id: 'vertical-slice-ashes.html', name: 'Vertical Slice Ashes', description: 'Vertical slice design for Ashes series' },
    { id: 'velocity-frame-v2.html', name: 'Velocity Frame V2', description: 'Velocity frame design v2' },
    { id: 'velocity-frame.html', name: 'Velocity Frame', description: 'Velocity frame design' },
    { id: 'fire-win-predictor.html', name: 'Fire Win Predictor', description: 'Fiery win predictor with flame effects' },
    { id: 'broadcast-score-bug.html', name: 'Broadcast Score Bug', description: 'Professional broadcast score bug' },
    
    // Premium Collection - New Overlay Templates
    { id: 'orbital-overlay.html', name: 'Orbital Overlay', description: 'Space orbital design with rotating elements' },
    { id: 'fragment-overlay.html', name: 'Fragment Overlay', description: 'Modern fragmented design with sharp edges' },
    { id: 'nebula-overlay.html', name: 'Nebula Overlay', description: 'Cosmic nebula with purple and blue gradients' },
    { id: 'aether-overlay.html', name: 'Aether Overlay', description: 'Ethereal and dreamy aesthetic' },
    { id: 'vector-overlay.html', name: 'Vector Overlay', description: 'Clean vector-based design' },
    { id: 'vector-shift.html', name: 'Vector Shift', description: 'Dynamic vector design with shifting colors' },
    { id: 'zenith-overlay.html', name: 'Zenith Overlay', description: 'Peak design reaching the zenith' },
    { id: 'chronos-overlay.html', name: 'Chronos Overlay', description: 'Time-themed overlay with clock elements' },
    { id: 'obsidian-overlay.html', name: 'Obsidian Overlay', description: 'Dark obsidian stone aesthetic' },
    { id: 'vanguard-overlay.html', name: 'Vanguard Overlay', description: 'Bold leading edge design' },
    { id: 'fractal-overlay.html', name: 'Fractal Overlay', description: 'Mathematical fractal patterns' },
    { id: 'glitch-overlay.html', name: 'Glitch Overlay', description: 'Digital glitch art style' },
    { id: 'titan-overlay.html', name: 'Titan Overlay', description: 'Massive powerful design' },
    { id: 'prism-overlay.html', name: 'Prism Overlay', description: 'Light refracting prism effect' },
    { id: 'octane-overlay.html', name: 'Octane Overlay', description: 'High octane racing style' },
  ];
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if template is provided in query parameter
    const templateFromQuery = req.query.template as string;
    
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match') as any;
    
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }

    // Use template from query parameter if provided, otherwise use from database
    const templateId = templateFromQuery || overlay.template || 'modern';
    console.log('Serving overlay with template:', templateId, 'from query:', templateFromQuery, 'from db:', overlay.template);
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
        // templateId already includes .html extension (e.g., "vintage.html")
        const testPath = path.join(overlaysDir, templateId);
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
      // Note: templateId already includes .html extension (e.g., "vintage.html")
      const templateUrl = templateId.endsWith('.html') 
        ? `${frontendUrl}/overlays/${templateId}`
        : `${frontendUrl}/overlays/${templateId}.html`;
        
      console.log('Template not found locally, trying frontend URL:', templateUrl);
      
      try {
        const axios = require('axios');
        // Increased timeout to 15 seconds and added error handling
        const templateResponse = await axios.get(templateUrl, {
          timeout: 15000,
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (compatible; ScoreX-Backend/1.0)'
          }
        });
        
        console.log('Template fetched successfully from frontend, status:', templateResponse.status);
        
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
        if (fetchError.code === 'ECONNABORTED') {
          console.log('Timeout error - template fetch took too long');
        } else if (fetchError.response) {
          console.log('Response status:', fetchError.response.status);
        }
      }
      
      // Final fallback - generate a simple overlay with the config
      console.log(`Template not found: ${templateId}, using fallback`);
      
      // Try to fetch match data from API using /matches/{id} endpoint (not /live)
      let matchData = null;
      try {
        const axios = require('axios');
        const matchResponse = await axios.get(`${apiBaseUrl}/matches/${matchId || ''}`, {
          timeout: 5000
        });
        matchData = matchResponse.data;
        console.log('Match data fetched:', matchData);
      } catch (fetchError) {
        console.log('Failed to fetch match data:', fetchError.message);
      }
      
      const Team = require('../models/Team').default;
      const teams = overlay.tournament?._id 
        ? await Team.find({ tournament: overlay.tournament._id }).limit(2) 
        : [];

      // Use matchData if available, otherwise fall back to tournament liveScores
      const match = matchData || {};
      const liveScores = matchData || overlay.tournament?.liveScores || {};
      const team1 = teams[0] || {};
      const team2 = teams[1] || {};
      
      // Get team names from match data if available
      const team1Name = match.team1?.name || team1?.name || liveScores.team1?.name || 'Team 1';
      const team2Name = match.team2?.name || team2?.name || liveScores.team2?.name || 'Team 2';
      const team1Score = match.team1Score || liveScores.team1?.score || 0;
      const team1Wickets = match.team1Wickets || liveScores.team1?.wickets || 0;
      const team2Score = match.team2Score || liveScores.team2?.score || 0;
      const team2Wickets = match.team2Wickets || liveScores.team2?.wickets || 0;
      const team1Overs = match.team1Overs || liveScores.team1?.overs || 0;
      const team2Overs = match.team2Overs || liveScores.team2?.overs || 0;
      
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
        // Auto-refresh every 3 seconds to get live scores
        setInterval(() => { window.location.reload(); }, 3000);
        
        // Try to fetch match data from API - use /matches/{id} not /live
        async function fetchMatchData() {
            try {
                const matchId = window.OVERLAY_CONFIG?.matchId;
                if (!matchId) {
                    console.log('No matchId in config');
                    return;
                }
                const apiBaseUrl = window.OVERLAY_CONFIG?.apiBaseUrl || '${apiBaseUrl}';
                const response = await fetch(apiBaseUrl + '/matches/' + matchId);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Match data:', data);
                    updateScoreboard(data);
                }
            } catch (e) {
                console.log('Could not fetch match data:', e.message);
            }
        }
        
        function updateScoreboard(data) {
            // Update the scoreboard with new data
            console.log('Updating scoreboard with:', data);
        }
        
        // Initial fetch
        fetchMatchData();
    </script>
</head>
<body>
    <div class="overlay-container">
        <div class="score-section">
            <div class="team-info">
                <div class="team-name">${team1Name}</div>
                <div class="score">${team1Score}/${team1Wickets}</div>
                <div class="overs">${team1Overs} overs</div>
            </div>
            <div class="vs-text">VS</div>
            <div class="team-info">
                <div class="team-name">${team2Name}</div>
                <div class="score">${team2Score}/${team2Wickets}</div>
                <div class="overs">${team2Overs} overs</div>
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
