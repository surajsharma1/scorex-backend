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

const getBaseUrl = () => process.env.API_BASE_URL || '/api/v1';
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

    const membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    if (!membership.hasMembership && !membership.isAdmin) {
      res.status(403).json({ message: 'Premium membership required for overlay creation', requiresMembership: true, currentLevel: membership.level });
      return;
    }


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
export const getOverlayTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let membership = { level: 0, isAdmin: false };
    if (req.user?.id) {
      membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    }




    // Load static templates from public/templates-updated.json for consistent rich names
    const templatesPath = path.join(process.cwd(), 'public/templates-updated.json');
    let templates: OverlayTemplate[] = [];
    
    try {
      if (fs.existsSync(templatesPath)) {
        const rawData = fs.readFileSync(templatesPath, 'utf8');
        const jsonData = JSON.parse(rawData);
        
        interface StaticTemplate {
          id: string;
          name: string;
          file: string;
          category: string;
          color: string;
        }
        
        templates = jsonData.map((t: StaticTemplate) => {
          const level = t.id.startsWith('lvl2') ? 2 : 1;
          return {
            ...t,
            url: `/overlays/${t.file}`,
            level,
          };
        }).filter((t: any) => t.level <= membership.level || membership.isAdmin);
      } else {
        console.warn('templates-updated.json not found, falling back to frontend public/');
      }
    } catch (err) {
      console.error('Failed to load templates JSON:', err);
    }

    res.json(templates);
  } catch (error) {
    console.error('getOverlayTemplates error:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
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
    const isDemo = req.query.demo === 'true';
    let overlay = null;
    
    // For demo/preview mode, skip DB lookup and use template directly
    if (isDemo) {
      const templateId = (req.params.id || req.query.template as string || 'lvl1-modern-blue');
      const templateFile = templateId.endsWith('.html') ? templateId : `${templateId}.html`;
      // ... rest of template lookup logic ...
      
      // Skip membership check for demo
      console.log('[serveOverlay] Demo mode enabled for template:', templateFile);
    } else {
      overlay = await Overlay.findOne({ publicId: req.params.id })
        .populate('tournament')
        .populate('match')
        .populate('createdBy', 'role membershipLevel membershipExpiresAt');

      if (!overlay) { res.status(404).send('Overlay not found'); return; }

      let userMembership = { hasMembership: false, level: 0, isAdmin: false };
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice(7);
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded?.id) {
            userMembership = await checkUserMembership(new mongoose.Types.ObjectId(decoded.id));
          }
        } catch {
          // Invalid token
        }
      }

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
    
    let matchId = (req.query.matchId as string) || (req.query.match as string) || 
                  (overlay.match as any)?._id?.toString() || (overlay.match as any)?.toString() || null;
    let tournamentId = (req.query.tournamentId as string) || 
                       (overlay.tournament as any)?._id?.toString() || (overlay.tournament as any)?.toString() || null;
    
    // 🆕 NEW: Tournament Context - Auto-pick live match if no specific matchId
    if (!matchId && tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      console.log('[serveOverlay] No matchId, finding live match for tournament:', tournamentId);
      const now = new Date();
      const liveMatch = await Match.findOne({
        tournamentId: new mongoose.Types.ObjectId(tournamentId),
        status: { $in: ['live', 'ongoing'] },
        date: { $gte: new Date(now.getTime() - 24*60*60*1000) } // Recent matches
      }).sort({ date: 1 }).select('_id').lean();
      
      if (liveMatch) {
        matchId = liveMatch._id.toString();
        console.log('[serveOverlay] ✅ Auto-selected live match:', matchId);
      } else {
        console.warn('[serveOverlay] No live match found for tournament:', tournamentId);
      }
    }
    
    console.log('[serveOverlay] Final - matchId:', matchId, 'tournamentId:', tournamentId);
    
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
