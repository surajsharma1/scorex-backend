/**
 * Overlay Controller — Fully Fixed
 * Fixes applied:
 * 1. membershipAtCreation now stores actual creator membership level
 * 2. Match.findByIdAndUpdate runs AFTER overlay is created (so _id exists)
 * 3. requiredMembershipLevel derived from template name if not sent by client
 * 4. serveOverlay checks CREATOR's membership, not the anonymous iframe viewer
 * 5. Template level enforced (lvl2 requires level 2)
 * 6. getOverlays deleteMany scoped to current user + $ne null guard
 * 7. populate uses strictPopulate: false to avoid crashes on dangling refs
 * 8. Progress param parsing fixed (was broken regex with escaped backslash)
 * 9. Preview data dispatched after window load to ensure overlay is ready
 * 10. Search paths hardened for Render deployment
 * 11. 🔥 GLOBAL OVERLAY AUTO-MATCH FIX: Automatically connects OBS overlays to live matches!
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Overlay from '../models/Overlay';
import Match from '../models/Match';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

const getBaseUrl = () => process.env.API_BASE_URL || 'https://scorex-backend.onrender.com/api/v1';

const SAFE_OVERLAY_PATH = '/o/pub'; // Adblocker-safe path alias
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const checkUserMembership = async (userId: mongoose.Types.ObjectId) => {
  const user = await User.findById(userId).select('role membershipLevel membershipExpiresAt');
  if (!user) return { hasMembership: false, level: 0, isAdmin: false };
  if (user.role === 'admin') return { hasMembership: true, level: 2, isAdmin: true };
  const expired = user.membershipExpiresAt && new Date() > user.membershipExpiresAt;
  const level = expired ? 0 : (user.membershipLevel || 0);
  return { hasMembership: level > 0, level, isAdmin: false };
};

// ─── Resolve overlay template file path (works on Render + local) ─────────────
const resolveTemplatePath = (templateFile: string): string | null => {
  const searchPaths = [
    path.resolve(process.cwd(), 'public/overlays'),
    path.resolve(process.cwd(), '../public/overlays'),
    path.resolve(__dirname, '../../public/overlays'),
    path.resolve(__dirname, '../../../public/overlays'),
    path.resolve(__dirname, '../../../../public/overlays'),
  ];
  for (const dir of searchPaths) {
    const candidate = path.join(dir, templateFile);
    if (fs.existsSync(candidate)) return candidate;
  }
  console.error('[resolveTemplatePath] Not found:', templateFile, '| Searched:', searchPaths);
  return null;
};

// ─── Membership-expired HTML page ─────────────────────────────────────────────
const membershipExpiredHtml = (frontendUrl: string, title: string, body: string) => `
  <html><head><title>${title}</title>
  <style>
    body{font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;
         justify-content:center;align-items:center;height:100vh;margin:0}
    .box{text-align:center;padding:40px;background:rgba(255,255,255,.1);border-radius:20px;max-width:400px}
    h1{color:#ff6b6b;margin-bottom:12px}
    p{color:#ccc;margin-bottom:24px;font-size:14px}
    a{background:#4ecdc4;color:#1a1a2e;padding:12px 28px;text-decoration:none;
      border-radius:30px;font-weight:bold;display:inline-block}
  </style>
  </head><body><div class="box">
  <h1>${title}</h1><p>${body}</p>
  <a href="${frontendUrl}/membership">Renew Membership</a>
  </div></body></html>
`;

export const regenerateOverlayUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const newPublicId = uuidv4();
    const newExpiry = new Date(Date.now() + URL_EXPIRY_MS);
    const overlay = await Overlay.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user?.id },
      { publicId: newPublicId, urlExpiresAt: newExpiry },
      { new: true }
    );
    if (!overlay) { res.status(404).json({ message: 'Overlay not found' }); return; }
    const publicUrl = `${getBaseUrl().replace('/api/v1', '')}${SAFE_OVERLAY_PATH}/${newPublicId}?template=${overlay.template}`;
    res.json({ publicId: newPublicId, url: publicUrl, urlExpiresAt: newExpiry, publicUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createOverlay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) { res.status(401).json({ message: 'Not authenticated' }); return; }

    const membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    if (!membership.hasMembership && !membership.isAdmin) {
      res.status(403).json({
        message: 'Premium membership required for overlay creation',
        requiresMembership: true,
        currentLevel: membership.level
      });
      return;
    }

    const { name, template, config, tournamentId, match, elements, requiredMembershipLevel } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Overlay name is required' }); return; }
    if (!template?.trim()) { res.status(400).json({ message: 'Template is required' }); return; }

    const templateStr = template.trim();
    const templateLevel = templateStr.startsWith('lvl2') ? 2 : 1;
    const membershipLevel = requiredMembershipLevel ?? templateLevel;

    if (templateLevel > membership.level && !membership.isAdmin) {
      res.status(403).json({
        message: `This template requires Enterprise membership (Level 2). You are on Level ${membership.level}.`,
        requiresMembership: true,
        requiredLevel: templateLevel,
        currentLevel: membership.level
      });
      return;
    }

    const placeholderHtml = `\n<div class="scorex-overlay" data-template="${templateStr}"></div>`;

    const overlayData: any = {
      name: name.trim(),
      template: templateStr,
      html: placeholderHtml,
      config: config || {},
      elements: elements || [],
      publicId: uuidv4(),
      createdBy: req.user.id,
      requiredMembershipLevel: membershipLevel,
      membershipAtCreation: membership.level,
      urlExpiresAt: new Date(Date.now() + URL_EXPIRY_MS),
      level: templateLevel,
      category: 'broadcast',
      isPremium: templateLevel > 1,
    };

    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      overlayData.tournament = new mongoose.Types.ObjectId(tournamentId);
    }
    if (match && mongoose.Types.ObjectId.isValid(match)) {
      overlayData.match = new mongoose.Types.ObjectId(match);
    }

    const overlay = await Overlay.create(overlayData);

    if (match && mongoose.Types.ObjectId.isValid(match)) {
      try { await Match.findByIdAndUpdate(match, { overlayId: overlay._id }); } catch {}
    }

    const publicUrl = `${getBaseUrl().replace('/api/v1', '')}${SAFE_OVERLAY_PATH}/${overlay.publicId}?template=${overlay.template}`;
    res.status(201).json({ ...overlay.toObject(), publicUrl, urlExpiresAt: overlay.urlExpiresAt });
  } catch (error) {
    console.error('Overlay creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlays = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) { res.json([]); return; }

    await Overlay.deleteMany({
      createdBy: req.user.id,
      urlExpiresAt: { $lt: new Date(), $ne: null }
    });

    const query: any = { createdBy: req.user.id };
    if (req.query.tournamentId) {
      query.tournament = new mongoose.Types.ObjectId(req.query.tournamentId as string);
    }
    const overlays = await Overlay.find(query)
      .populate({ path: 'match', select: 'name team1Name team2Name status', options: { strictPopulate: false } })
      .populate({ path: 'tournament', select: 'name', options: { strictPopulate: false } })
      .sort({ createdAt: -1 })
      .lean();

    const result = overlays.map((o: any) => ({
      ...o,
      publicUrl: `${getBaseUrl()}/overlays/public/${o.publicId}?template=${o.template}`
    }));

    res.json(result);
  } catch (error: any) {
    console.error('[OVERLAYS] ERROR in getOverlays:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
};

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

export const deleteOverlay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOneAndDelete({ _id: req.params.id, createdBy: req.user?.id });
    if (!overlay) { res.status(404).json({ message: 'Overlay not found' }); return; }
    res.json({ message: 'Overlay deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlayTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let membership = { level: 0, isAdmin: false };
    if (req.user?.id) {
      membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    }

    interface OverlayTemplate {
      id: string; name: string; file?: string; url?: string;
      category: string; color: string; level: number;
    }
    interface StaticTemplate {
      id: string; name: string; file: string; category: string; color: string;
    }

    const templateJsonPaths = [
      path.join(process.cwd(), 'public/templates.json'),
      path.join(process.cwd(), '../public/templates.json'),
      path.join(__dirname, '../../public/templates.json'),
      path.join(__dirname, '../../../public/templates.json'),
    ];

    let templates: OverlayTemplate[] = [];
    let templatesPath: string | null = null;
    for (const p of templateJsonPaths) {
      if (fs.existsSync(p)) { templatesPath = p; break; }
    }

    if (templatesPath) {
      try {
        const rawData = fs.readFileSync(templatesPath, 'utf8');
        const jsonData: StaticTemplate[] = JSON.parse(rawData);
        templates = jsonData
          .map((t): OverlayTemplate => ({
            ...t,
            url: `/overlays/${t.file}`,
            level: t.id.startsWith('lvl2') ? 2 : 1,
          }))
          .filter(t => membership.isAdmin || t.level <= membership.level);
      } catch (err) {
        console.error('Failed to parse templates.json:', err);
      }
    } else {
      console.warn('[getOverlayTemplates] templates.json not found in any search path');
    }

    res.json(templates);
  } catch (error) {
    console.error('getOverlayTemplates error:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
};

export const getMembershipStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) { res.status(401).json({ message: 'Not authenticated' }); return; }
    const membership = await checkUserMembership(new mongoose.Types.ObjectId(req.user.id));
    res.json(membership);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const isDemo = req.query.demo === 'true';
    let overlay: any = null;

    if (!isDemo) {
      overlay = await Overlay.findOne({ publicId: req.params.id })
        .populate({ path: 'tournament', options: { strictPopulate: false } })
        .populate({ path: 'match', options: { strictPopulate: false } })
        .populate({ path: 'createdBy', select: 'role membershipLevel membershipExpiresAt', options: { strictPopulate: false } });

      if (!overlay) { res.status(404).send('Overlay not found'); return; }

      if (overlay.membershipAtCreation > 0) {
        const creatorId = (overlay.createdBy as any)?._id || overlay.createdBy;
        if (creatorId) {
          const creatorMembership = await checkUserMembership(
            new mongoose.Types.ObjectId(creatorId.toString())
          );
          if (!creatorMembership.hasMembership && !creatorMembership.isAdmin) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://scorex-live.vercel.app';
            res.status(403).send(membershipExpiredHtml(
              frontendUrl,
              '🔒 Membership Expired',
              "The creator's membership has expired. This overlay is currently inactive."
            ));
            return;
          }
          const templateStr = (req.query.template as string) || overlay.template || '';
          const templateLevel = templateStr.startsWith('lvl2') ? 2 : 1;
          if (templateLevel > creatorMembership.level && !creatorMembership.isAdmin) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://scorex-live.vercel.app';
            res.status(403).send(membershipExpiredHtml(
              frontendUrl,
              '🔒 Enterprise Template',
              'This overlay template requires an Enterprise membership.'
            ));
            return;
          }
        }
      }
    }

    const templateId = (req.query.template as string) || overlay?.template || 'lvl1-modern-bar';
    const templateFile = templateId.endsWith('.html') ? templateId : `${templateId}.html`;
    const templatePath = resolveTemplatePath(templateFile);

    if (!templatePath) {
      res.status(404).send(`Template not found: ${templateFile}`);
      return;
    }

    const isPreviewMode = req.query.preview === 'true' || isDemo;

    if (isPreviewMode) {
      const progressStr = req.query.progress as string || '69';
      const progress = Math.max(0, Math.min(100, parseInt(progressStr) || 69));

      const demoData = {
        matchName: 'ScoreX Premium Showcase',
        tournamentName: 'PREVIEW MODE',
        team1Name: 'PREMIUM BATS',
        team2Name: 'ROYAL CHALLENGERS',
        team1Score: Math.round(180 * (progress / 100)),
        team1Wickets: Math.round(9 * (progress / 100)),
        team1Overs: `${Math.round(20 * (progress / 100))}.0`,
        strikerName: 'V Kohli',
        strikerRuns: Math.round(68 * (progress / 100)),
        strikerBalls: Math.round(42 * (progress / 100)),
        nonStrikerName: 'R Sharma',
        nonStrikerRuns: Math.round(32 * (progress / 100)),
        nonStrikerBalls: Math.round(28 * (progress / 100)),
        bowlerName: 'J Anderson',
        bowlerRuns: Math.round(45 * (progress / 100)),
        bowlerWickets: Math.round(2 * (progress / 100)),
        bowlerOvers: '3.4',
        target: 181,
        runRate: '8.44',
        requiredRunRate: '9.23',
        status: 'live',
      };

      let html = fs.readFileSync(templatePath, 'utf8');
      html = html.replace('</head>', `
        <script src="/overlays/overlay-utils.js"></script>
        <script>
          (function() {
            var data = ${JSON.stringify(demoData)};
            function dispatch() {
              window.dispatchEvent(new CustomEvent('scorex:update', { detail: data }));
              window.postMessage({ type: 'UPDATE_SCORE', data: data }, '*');
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() { setTimeout(dispatch, 100); });
            } else {
              setTimeout(dispatch, 100);
            }
          })();
        </script>
      </head>`);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(html);
      return;
    }

    // ─── Live mode: inject OVERLAY_CONFIG + engine ──────────────────────────
    let matchId: string | null =
      (req.query.matchId as string) ||
      (req.query.match as string) ||
      (overlay?.match as any)?._id?.toString() || null;

    let tournamentId: string | null =
      (req.query.tournamentId as string) ||
      (overlay?.tournament as any)?._id?.toString() || null;

    // 🔥 FIX 11: Auto-find a live match for the tournament OR the user if no matchId given
    if (!matchId) {
      if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
        console.log('[serveOverlay] Auto-finding live match for tournament:', tournamentId);
        const liveMatch = await Match.findOne({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          status: { $in: ['live', 'ongoing'] },
          date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).sort({ date: 1 }).select('_id').lean();

        if (liveMatch) matchId = liveMatch._id.toString();
      } else if (overlay?.createdBy) {
        console.log('[serveOverlay] Auto-finding global live match for creator:', overlay.createdBy);
        const globalLiveMatch = await Match.findOne({
          scorerId: overlay.createdBy,
          status: { $in: ['live', 'ongoing'] },
          date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).sort({ updatedAt: -1 }).select('_id').lean();

        if (globalLiveMatch) {
          matchId = globalLiveMatch._id.toString();
          console.log('[serveOverlay] Auto-selected Global live match:', matchId);
        }
      }
    }

    const apiBaseUrl = getBaseUrl();
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('</head>', `
      <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
      <script src="/overlays/overlay-utils.js"></script>
      <script>
        window.OVERLAY_CONFIG = {
          matchId: ${JSON.stringify(matchId)},
          tournamentId: ${JSON.stringify(tournamentId)},
          apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
          overlayId: ${JSON.stringify(overlay?._id?.toString() || null)},
          config: ${JSON.stringify(overlay?.config || {})},
        };
      </script>
      <script src="/overlays/engine.js"></script>
    </head>`);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';");
    
    res.send(html);
  } catch (error) {
    console.error('serveOverlay error:', error);
    res.status(500).send('Server error');
  }
};

export default {
  createOverlay, getOverlays, getOverlay, updateOverlay, deleteOverlay,
  getOverlayTemplates, getMembershipStatus, serveOverlay, regenerateOverlayUrl
};