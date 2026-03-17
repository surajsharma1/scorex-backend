/**
 * Overlay Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. createOverlay never set the required `html` field — Overlay.create() threw
 *    a Mongoose validation error every time an overlay was saved.
 *    FIX: set html to a minimal placeholder derived from the template name.
 *
 * 2. serveOverlay decoded the JWT with atob(token.split('.')[1]) — this is
 *    completely insecure; it never verifies the signature so any attacker can
 *    forge a token and get any membership level they want.
 *    FIX: use jwt.verify() with the same JWT_SECRET used everywhere else.
 *
 * 3. createOverlay and all handlers used (req as any).user._id —
 *    auth middleware sets req.user.id (a string). Fixed throughout.
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import Overlay from '../models/Overlay';
import Match from '../models/Match';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

const getBaseUrl = () => process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const JWT_SECRET = process.env.JWT_SECRET || 'scorex-secret-key-change-in-production';

// ─── membership helper ────────────────────────────────────────────────────────
const checkUserMembership = async (userId: mongoose.Types.ObjectId) => {
  const user = await User.findById(userId).select('role membershipLevel membershipExpiresAt');
  if (!user) return { hasMembership: false, level: 0, isAdmin: false };
  if (user.role === 'admin') return { hasMembership: true, level: 2, isAdmin: true };
  const expired = user.membershipExpiresAt && new Date() > user.membershipExpiresAt;
  const level = expired ? 0 : (user.membershipLevel || 0);
  return { hasMembership: level > 0, level, isAdmin: false };
};

// ─── regenerateOverlayUrl ────────────────────────────────────────────────────
export const regenerateOverlayUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const newPublicId = uuidv4();
    const newExpiry = new Date(Date.now() + URL_EXPIRY_MS);
    // FIX: use req.user.id not user._id
    const overlay = await Overlay.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user?.id },
      { publicId: newPublicId, urlExpiresAt: newExpiry },
      { new: true }
    );
    if (!overlay) { res.status(404).json({ message: 'Overlay not found' }); return; }
    const publicUrl = `${getBaseUrl()}/overlays/public/${newPublicId}?template=${overlay.template}`;
    res.json({ publicId: newPublicId, url: publicUrl, urlExpiresAt: newExpiry, publicUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── createOverlay ────────────────────────────────────────────────────────────
export const createOverlay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: use req.user.id not user._id
    if (!req.user?.id) { res.status(401).json({ message: 'Not authenticated' }); return; }

    // Temporarily disabled membership check for overlay creation to allow all users to see/create overlays
    // const membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    // if (!membership.hasMembership && !membership.isAdmin) {
    //   res.status(403).json({ message: 'Premium membership required', requiresMembership: true, currentLevel: membership.level });
    //   return;
    // }

    const { name, template, config, tournament, match, elements, requiredMembershipLevel } = req.body;
    if (!name?.trim())     { res.status(400).json({ message: 'Overlay name is required' }); return; }
    if (!template?.trim()) { res.status(400).json({ message: 'Template is required' }); return; }

    const membershipLevel = requiredMembershipLevel ?? 0;

    // FIX #1: html is required in the Overlay schema — was never set, causing validation error
    // Generate a minimal placeholder HTML that references the template file
    const placeholderHtml = `<!-- ScoreX Overlay: ${name} | Template: ${template} -->\n<div class="scorex-overlay" data-template="${template}"></div>`;

    const overlayData: any = {
      name: name.trim(),
      template: template.trim(),
      html: placeholderHtml,     // FIX: previously missing entirely
      config: config || {},
      elements: elements || [],
      publicId: uuidv4(),
      createdBy: req.user.id,    // FIX: was user._id
      requiredMembershipLevel: membershipLevel,
      membershipAtCreation: 0,
      urlExpiresAt: new Date(Date.now() + URL_EXPIRY_MS),
      level: membershipLevel > 1 ? 2 : 1,
      category: 'broadcast',
      isPremium: membershipLevel > 1,
    };

    if (tournament && mongoose.Types.ObjectId.isValid(tournament)) {
      overlayData.tournament = new mongoose.Types.ObjectId(tournament);
    }
    if (match && mongoose.Types.ObjectId.isValid(match)) {
      overlayData.match = new mongoose.Types.ObjectId(match);
      try { await Match.findByIdAndUpdate(match, { overlayId: overlayData._id }); } catch {}
    }

    const overlay = await Overlay.create(overlayData);
    const publicUrl = `${getBaseUrl()}/overlays/public/${overlay.publicId}?template=${overlay.template}`;

    res.status(201).json({ ...overlay.toObject(), publicUrl, urlExpiresAt: overlay.urlExpiresAt });
  } catch (error) {
    console.error('Overlay creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── getOverlays ─────────────────────────────────────────────────────────────
export const getOverlays = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: req.user.id not user._id
    const overlays = await Overlay.find({ createdBy: req.user?.id }).sort({ createdAt: -1 });
    const baseUrl = getBaseUrl();
    const result = overlays.map(o => ({
      ...o.toObject(),
      publicUrl: `${baseUrl}/overlays/public/${o.publicId}?template=${o.template}`
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── getOverlay ───────────────────────────────────────────────────────────────
export const getOverlay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOne({ _id: req.params.id, createdBy: req.user?.id });
    if (!overlay) { res.status(404).json({ message: 'Overlay not found' }); return; }
    const publicUrl = `${getBaseUrl()}/overlays/public/${overlay.publicId}?template=${overlay.template}`;
    res.json({ ...overlay.toObject(), publicUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── updateOverlay ────────────────────────────────────────────────────────────
export const updateOverlay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user?.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!overlay) { res.status(404).json({ message: 'Overlay not found' }); return; }
    res.json(overlay);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── deleteOverlay ────────────────────────────────────────────────────────────
export const deleteOverlay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOneAndDelete({ _id: req.params.id, createdBy: req.user?.id });
    if (!overlay) { res.status(404).json({ message: 'Overlay not found' }); return; }
    res.json({ message: 'Overlay deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── getOverlayTemplates ──────────────────────────────────────────────────────
export const getOverlayTemplates = async (req: Request, res: Response): Promise<void> => {
  res.json([
    { id: 'lvl1-broadcast-bar',  name: 'Level 1: Broadcast Bar',    url: '/overlays/lvl1-broadcast-bar.html',  level: 1 },
    { id: 'lvl1-curved-compact', name: 'Level 1: Curved Compact',   url: '/overlays/lvl1-curved-compact.html', level: 1 },
    { id: 'lvl1-dark-angular',   name: 'Level 1: Dark Angular',     url: '/overlays/lvl1-dark-angular.html',   level: 1 },
    { id: 'lvl1-grass-theme',    name: 'Level 1: Grass Theme',      url: '/overlays/lvl1-grass-theme.html',    level: 1 },
    { id: 'lvl1-high-vis',       name: 'Level 1: High Visibility',  url: '/overlays/lvl1-high-vis.html',       level: 1 },
    { id: 'lvl1-minimal-dark',   name: 'Level 1: Minimal Dark',     url: '/overlays/lvl1-minimal-dark.html',   level: 1 },
    { id: 'lvl1-modern-bar',     name: 'Level 1: Modern Bar',       url: '/overlays/lvl1-modern-bar.html',     level: 1 },
    { id: 'lvl1-modern-blue',    name: 'Level 1: Modern Blue',      url: '/overlays/lvl1-modern-blue.html',    level: 1 },
    { id: 'lvl1-paper-style',    name: 'Level 1: Paper Style',      url: '/overlays/lvl1-paper-style.html',    level: 1 },
    { id: 'lvl1-red-card',       name: 'Level 1: Red Card',         url: '/overlays/lvl1-red-card.html',       level: 1 },
    { id: 'lvl1-retro-board',    name: 'Level 1: Retro Board',      url: '/overlays/lvl1-retro-board.html',    level: 1 },
    { id: 'lvl1-side-panel',     name: 'Level 1: Side Panel',       url: '/overlays/lvl1-side-panel.html',     level: 1 },
    { id: 'lvl1-simple-text',    name: 'Level 1: Simple Text',      url: '/overlays/lvl1-simple-text.html',    level: 1 },
    { id: 'lvl2-broadcast-pro',  name: 'Level 2: Broadcast Pro',    url: '/overlays/lvl2-broadcast-pro.html',  level: 2 },
    { id: 'lvl2-cosmic-orbit',   name: 'Level 2: Cosmic Orbit',     url: '/overlays/lvl2-cosmic-orbit.html',   level: 2 },
    { id: 'lvl2-cyber-glitch',   name: 'Level 2: Cyber Glitch',     url: '/overlays/lvl2-cyber-glitch.html',   level: 2 },
    { id: 'lvl2-flame-thrower',  name: 'Level 2: Flame Thrower',    url: '/overlays/lvl2-flame-thrower.html',  level: 2 },
    { id: 'lvl2-glass-morphism', name: 'Level 2: Glass Morphism',   url: '/overlays/lvl2-glass-morphism.html', level: 2 },
    { id: 'lvl2-gold-rush',      name: 'Level 2: Gold Rush',        url: '/overlays/lvl2-gold-rush.html',      level: 2 },
    { id: 'lvl2-hologram',       name: 'Level 2: Hologram',         url: '/overlays/lvl2-hologram.html',       level: 2 },
    { id: 'lvl2-matrix-rain',    name: 'Level 2: Matrix Rain',      url: '/overlays/lvl2-matrix-rain.html',    level: 2 },
    { id: 'lvl2-neon-pulse',     name: 'Level 2: Neon Pulse',       url: '/overlays/lvl2-neon-pulse.html',     level: 2 },
    { id: 'lvl2-particle-storm', name: 'Level 2: Particle Storm',   url: '/overlays/lvl2-particle-storm.html', level: 2 },
    { id: 'lvl2-rgb-split',      name: 'Level 2: RGB Split',        url: '/overlays/lvl2-rgb-split.html',      level: 2 },
    { id: 'lvl2-speed-racer',    name: 'Level 2: Speed Racer',      url: '/overlays/lvl2-speed-racer.html',    level: 2 },
    { id: 'lvl2-tech-hud',       name: 'Level 2: Tech HUD',         url: '/overlays/lvl2-tech-hud.html',       level: 2 },
    { id: 'lvl2-thunder-strike', name: 'Level 2: Thunder Strike',   url: '/overlays/lvl2-thunder-strike.html', level: 2 },
    { id: 'lvl2-vinyl-spin',     name: 'Level 2: Vinyl Spin',       url: '/overlays/lvl2-vinyl-spin.html',     level: 2 },
    { id: 'lvl2-water-flow',     name: 'Level 2: Water Flow',       url: '/overlays/lvl2-water-flow.html',     level: 2 },
  ]);
};

// ─── getMembershipStatus ──────────────────────────────────────────────────────
export const getMembershipStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) { res.status(401).json({ message: 'Not authenticated' }); return; }
    const membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    res.json(membership);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── serveOverlay ─────────────────────────────────────────────────────────────
export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament')
      .populate('match')
      .populate('createdBy', 'role membershipLevel membershipExpiresAt');

    if (!overlay) { res.status(404).send('Overlay not found'); return; }

    let userMembership = { hasMembership: false, level: 0, isAdmin: false };
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        // FIX #2: was atob(token.split('.')[1]) — unverified, forgeable
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.id) {
          userMembership = await checkUserMembership(new mongoose.Types.ObjectId(decoded.id));
        }
      } catch {
        // Invalid/expired token — continue as unauthenticated
      }
    }

    // Gate access for membership-required overlays
    if (!userMembership.hasMembership && !userMembership.isAdmin && overlay.membershipAtCreation > 0) {
      res.status(403).send(`
        <html><head><title>Membership Required</title>
        <style>body{font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
        .box{text-align:center;padding:40px;background:rgba(255,255,255,.1);border-radius:20px}
        h1{color:#ff6b6b}a{background:#4ecdc4;color:#1a1a2e;padding:12px 28px;text-decoration:none;border-radius:30px;font-weight:bold}</style>
        </head><body><div class="box">
        <h1>🔒 Membership Required</h1>
        <p>This overlay requires a premium membership.</p>
        <a href="${process.env.FRONTEND_URL || 'https://scorex-live.vercel.app'}/membership">Upgrade Now</a>
        </div></body></html>
      `);
      return;
    }

    const templateId = (req.query.template as string) || overlay.template || 'lvl1-modern-bar';
    const templateFile = templateId.endsWith('.html') ? templateId : `${templateId}.html`;

    // Locate the template file
    const searchPaths = [
      path.resolve(process.cwd(), 'public/overlays'),
      path.resolve(__dirname, '../public/overlays'),
      path.resolve(__dirname, '../../public/overlays'),
      path.resolve(__dirname, '../../../public/overlays'),
    ];

    let templatePath: string | null = null;
    for (const dir of searchPaths) {
      const candidate = path.join(dir, templateFile);
      if (fs.existsSync(candidate)) { templatePath = candidate; break; }
    }

    if (!templatePath) {
      res.status(404).send(`Template not found: ${templateFile}`);
      return;
    }

    console.log('[serveOverlay] Public ID:', req.params.id, 'Query:', req.query);
    
    // ✅ Prioritize URL params for live overrides
    const matchId = req.query.matchId as string || req.query.match as string || 
                    (overlay.match as any)?._id?.toString() || overlay.match?.toString() || null;
    const tournamentId = req.query.tournamentId as string || 
                         (overlay.tournament as any)?._id?.toString() || overlay.tournament?.toString() || null;
    
    console.log('[serveOverlay] Using matchId:', matchId, 'tournamentId:', tournamentId);
    
    const apiBaseUrl = getBaseUrl();

    let html = fs.readFileSync(templatePath, 'utf8');
    
    // FIX: Inject Socket.io, utils, OVERLAY_CONFIG, and engine.js into EVERY template
    html = html.replace('</head>', `
      <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
      <script src="/overlays/overlay-utils.js"></script>
      <script>
        window.OVERLAY_CONFIG = {
          matchId: ${JSON.stringify(matchId)},
          tournamentId: ${JSON.stringify(tournamentId)},
          apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
          overlayId: ${JSON.stringify(overlay._id)},
          config: ${JSON.stringify(overlay.config || {})},
        };
      </script>
      <script src="/overlays/engine.js"></script>
    </head>`);

res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.send(html);
  } catch (error) {
    console.error('serveOverlay error:', error);
    res.status(500).send('Server error');
  }
};

export default { createOverlay, getOverlays, getOverlay, updateOverlay, deleteOverlay, getOverlayTemplates, getMembershipStatus, serveOverlay, regenerateOverlayUrl };
