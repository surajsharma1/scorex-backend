"use strict";
/**
 * Overlay Controller — Fixed & Rewritten
 * All TypeScript errors resolved, syntax cleaned
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveOverlay = exports.getMembershipStatus = exports.getOverlayTemplates = exports.deleteOverlay = exports.updateOverlay = exports.getOverlay = exports.getOverlays = exports.createOverlay = exports.regenerateOverlayUrl = void 0;
const uuid_1 = require("uuid");
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Overlay_1 = __importDefault(require("../models/Overlay"));
const Match_1 = __importDefault(require("../models/Match"));
const User_1 = __importDefault(require("../models/User"));
const getBaseUrl = () => process.env.API_BASE_URL || '/api/v1';
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const JWT_SECRET = process.env.JWT_SECRET || 'scorex-secret-key-change-in-production';
const checkUserMembership = async (userId) => {
    const user = await User_1.default.findById(userId).select('role membershipLevel membershipExpiresAt');
    if (!user)
        return { hasMembership: false, level: 0, isAdmin: false };
    if (user.role === 'admin')
        return { hasMembership: true, level: 2, isAdmin: true };
    const expired = user.membershipExpiresAt && new Date() > user.membershipExpiresAt;
    const level = expired ? 0 : (user.membershipLevel || 0);
    return { hasMembership: level > 0, level, isAdmin: false };
};
const regenerateOverlayUrl = async (req, res) => {
    try {
        const newPublicId = (0, uuid_1.v4)();
        const newExpiry = new Date(Date.now() + URL_EXPIRY_MS);
        const overlay = await Overlay_1.default.findOneAndUpdate({ _id: req.params.id, createdBy: req.user?.id }, { publicId: newPublicId, urlExpiresAt: newExpiry }, { new: true });
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        const publicUrl = `${getBaseUrl()}/overlays/public/${newPublicId}?template=${overlay.template}`;
        res.json({ publicId: newPublicId, url: publicUrl, urlExpiresAt: newExpiry, publicUrl });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.regenerateOverlayUrl = regenerateOverlayUrl;
const createOverlay = async (req, res) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const membership = await checkUserMembership(new mongoose_1.default.Types.ObjectId(req.user.id));
        if (!membership.hasMembership && !membership.isAdmin) {
            res.status(403).json({ message: 'Premium membership required for overlay creation', requiresMembership: true, currentLevel: membership.level });
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
        // Derive level from template name if not explicitly provided
        const templateLevel = template?.trim().startsWith('lvl2') ? 2 : 1;
        const membershipLevel = requiredMembershipLevel ?? templateLevel;
        const placeholderHtml = `<!-- ScoreX Overlay: ${name} | Template: ${template} -->\n<div class="scorex-overlay" data-template="${template}"></div>`;
        const overlayData = {
            name: name.trim(),
            template: template.trim(),
            html: placeholderHtml,
            config: config || {},
            elements: elements || [],
            publicId: (0, uuid_1.v4)(),
            createdBy: req.user.id,
            requiredMembershipLevel: membershipLevel,
            membershipAtCreation: membership.level, // ✅ FIXED: was hardcoded 0
            urlExpiresAt: new Date(Date.now() + URL_EXPIRY_MS),
            level: membershipLevel > 1 ? 2 : 1,
            category: 'broadcast',
            isPremium: membershipLevel > 1,
        };
        if (tournament && mongoose_1.default.Types.ObjectId.isValid(tournament)) {
            overlayData.tournament = new mongoose_1.default.Types.ObjectId(tournament);
        }
        if (match && mongoose_1.default.Types.ObjectId.isValid(match)) {
            overlayData.match = new mongoose_1.default.Types.ObjectId(match);
        }
        const overlay = await Overlay_1.default.create(overlayData);
        // ✅ FIXED: update match AFTER overlay is created so overlay._id exists
        if (match && mongoose_1.default.Types.ObjectId.isValid(match)) {
            try {
                await Match_1.default.findByIdAndUpdate(match, { overlayId: overlay._id });
            }
            catch { }
        }
        const publicUrl = `${getBaseUrl()}/overlays/public/${overlay.publicId}?template=${overlay.template}`;
        res.status(201).json({ ...overlay.toObject(), publicUrl, urlExpiresAt: overlay.urlExpiresAt });
    }
    catch (error) {
        console.error('Overlay creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOverlay = createOverlay;
const getOverlays = async (req, res) => {
    try {
        console.log('[OVERLAYS] getOverlays called. User ID:', req.user?.id || 'NO_USER');
        if (!req.user?.id) {
            console.log('[OVERLAYS] No authenticated user, returning empty array');
            res.json([]);
            return;
        }
        console.log('[OVERLAYS] Checking Overlay model exists:', !!Overlay_1.default);
        // ✅ FIXED: only delete current user's expired overlays, not everyone's
        await Overlay_1.default.deleteMany({
            createdBy: req.user.id,
            urlExpiresAt: { $lt: new Date(), $ne: null }
        });
        const overlays = await Overlay_1.default.find({ createdBy: req.user.id })
            .populate({ path: 'match', select: 'name team1Name team2Name status', options: { strictPopulate: false } })
            .populate({ path: 'tournament', select: 'name', options: { strictPopulate: false } })
            .sort({ createdAt: -1 })
            .lean();
        console.log(`[OVERLAYS] Found ${overlays.length} overlays, populating done`);
        const result = overlays.map((o) => ({
            ...o,
            publicUrl: `${getBaseUrl()}/overlays/public/${o.publicId}?template=${o.template}`
        }));
        console.log('[OVERLAYS] Sending response:', result.length, 'items');
        res.json(result);
    }
    catch (error) {
        console.error('[OVERLAYS] ERROR in getOverlays:', error.message, error.stack);
        res.status(500).json({ message: 'Server error', debug: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
};
exports.getOverlays = getOverlays;
const getOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findOne({ _id: req.params.id, createdBy: req.user?.id });
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        const publicUrl = `${getBaseUrl()}/overlays/public/${overlay.publicId}?template=${overlay.template}`;
        res.json({ ...overlay.toObject(), publicUrl });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOverlay = getOverlay;
const updateOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findOneAndUpdate({ _id: req.params.id, createdBy: req.user?.id }, req.body, { new: true, runValidators: true });
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        res.json(overlay);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateOverlay = updateOverlay;
const deleteOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findOneAndDelete({ _id: req.params.id, createdBy: req.user?.id });
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        res.json({ message: 'Overlay deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteOverlay = deleteOverlay;
const getOverlayTemplates = async (req, res) => {
    try {
        let membership = { level: 0, isAdmin: false };
        if (req.user?.id) {
            membership = await checkUserMembership(new mongoose_1.default.Types.ObjectId(req.user.id));
        }
        const templatesPath = path_1.default.join(process.cwd(), 'public/templates.json');
        let templates = [];
        try {
            if (fs_1.default.existsSync(templatesPath)) {
                const rawData = fs_1.default.readFileSync(templatesPath, 'utf8');
                const jsonData = JSON.parse(rawData);
                templates = jsonData.map((t) => {
                    const level = t.id.startsWith('lvl2') ? 2 : 1;
                    return {
                        ...t,
                        url: `/overlays/${t.file}`,
                        level,
                    };
                }).filter((t) => t.level <= membership.level || membership.isAdmin);
            }
            else {
                console.warn('templates.json not found at', templatesPath);
            }
        }
        catch (err) {
            console.error('Failed to load templates JSON:', err);
        }
        res.json(templates);
    }
    catch (error) {
        console.error('getOverlayTemplates error:', error);
        res.status(500).json({ error: 'Failed to load templates' });
    }
};
exports.getOverlayTemplates = getOverlayTemplates;
const getMembershipStatus = async (req, res) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const membership = await checkUserMembership(new mongoose_1.default.Types.ObjectId(req.user.id));
        res.json(membership);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMembershipStatus = getMembershipStatus;
const serveOverlay = async (req, res) => {
    try {
        const isDemo = req.query.demo === 'true';
        let overlay = null;
        if (!isDemo) {
            overlay = await Overlay_1.default.findOne({ publicId: req.params.id })
                .populate('tournament')
                .populate('match')
                .populate('createdBy', 'role membershipLevel membershipExpiresAt');
            if (!overlay) {
                res.status(404).send('Overlay not found');
                return;
            }
            // ✅ FIXED: Check CREATOR's membership, not the anonymous iframe viewer
            // Iframes never send Authorization headers, so checking req.headers.authorization
            // on an iframe src always results in hasMembership=false → wrongful 403.
            // The correct gate is: did the creator maintain their membership?
            const creatorId = overlay.createdBy?._id || overlay.createdBy;
            if (overlay.membershipAtCreation > 0 && creatorId) {
                const creatorMembership = await checkUserMembership(new mongoose_1.default.Types.ObjectId(creatorId.toString()));
                if (!creatorMembership.hasMembership && !creatorMembership.isAdmin) {
                    res.status(403).send(`
            <html><head><title>Membership Expired</title>
            <style>body{font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
            .box{text-align:center;padding:40px;background:rgba(255,255,255,.1);border-radius:20px}
            h1{color:#ff6b6b}a{background:#4ecdc4;color:#1a1a2e;padding:12px 28px;text-decoration:none;border-radius:30px;font-weight:bold}</style>
            </head><body><div class="box">
            <h1>🔒 Membership Expired</h1>
            <p>The creator's membership has expired. This overlay is inactive.</p>
            <a href="${process.env.FRONTEND_URL || 'https://scorex-live.vercel.app'}/membership">Renew Now</a>
            </div></body></html>
          `);
                    return;
                }
            }
        }
        const templateId = req.query.template || overlay?.template || 'lvl1-modern-bar';
        const templateFile = templateId.endsWith('.html') ? templateId : `${templateId}.html`;
        // ✅ Enforce level access: lvl2 templates require level 2 membership
        if (!isDemo && overlay) {
            const templateLevel = templateFile.startsWith('lvl2') ? 2 : 1;
            if (templateLevel > (overlay.level || 1)) {
                res.status(403).send(`
          <html><head><title>Template Restricted</title>
          <style>body{font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
          .box{text-align:center;padding:40px;background:rgba(255,255,255,.1);border-radius:20px}
          h1{color:#ff6b6b}</style>
          </head><body><div class="box">
          <h1>🔒 Enterprise Template</h1>
          <p>This overlay template requires an Enterprise membership.</p>
          </div></body></html>
        `);
                return;
            }
        }
        const searchPaths = [
            path_1.default.resolve(process.cwd(), 'public/overlays'),
            path_1.default.resolve(__dirname, '../public/overlays'),
            path_1.default.resolve(__dirname, '../../public/overlays'),
            path_1.default.resolve(__dirname, '../../../public/overlays'),
        ];
        let templatePath = null;
        for (const dir of searchPaths) {
            const candidate = path_1.default.join(dir, templateFile);
            if (fs_1.default.existsSync(candidate)) {
                templatePath = candidate;
                break;
            }
        }
        if (!templatePath) {
            res.status(404).send(`Template not found: ${templateFile}`);
            return;
        }
        let matchId = null;
        let tournamentId = null;
        const isPreviewMode = req.query.preview === 'true' || req.query.demo === 'true';
        if (!isPreviewMode) {
            matchId = req.query.matchId || req.query.match ||
                overlay?.match?._id?.toString() || null;
            tournamentId = req.query.tournamentId ||
                overlay?.tournament?._id?.toString() || null;
            if (!matchId && tournamentId && mongoose_1.default.Types.ObjectId.isValid(tournamentId)) {
                const liveMatch = await Match_1.default.findOne({
                    tournamentId: new mongoose_1.default.Types.ObjectId(tournamentId),
                    status: { $in: ['live', 'ongoing'] },
                    date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }).sort({ date: 1 }).select('_id').lean();
                if (liveMatch)
                    matchId = liveMatch._id.toString();
            }
        }
        if (isPreviewMode) {
            const progressStr = req.query.progress || '69%';
            const progress = parseInt(progressStr) || 69;
            const demoData = {
                matchName: 'ScoreX Premium Showcase',
                tournamentName: 'PREVIEW MODE',
                team1Name: 'PREMIUM BATS',
                team1Score: Math.round(180 * (progress / 100)),
                team1Wickets: Math.round(10 * (progress / 100)),
                team1Overs: '14.2',
                strikerName: 'V Kohli',
                strikerRuns: Math.round(68 * (progress / 100)),
                strikerBalls: 42,
                nonStrikerName: 'R Sharma',
                nonStrikerRuns: Math.round(32 * (progress / 100)),
                nonStrikerBalls: 28,
                bowlerName: 'J Anderson',
                bowlerRuns: Math.round(45 * (progress / 100)),
                bowlerWickets: Math.round(2 * (progress / 100)),
                bowlerOvers: '3.4',
                target: 180,
                runRate: '8.44',
                requiredRunRate: '9.23'
            };
            let html = fs_1.default.readFileSync(templatePath, 'utf8');
            html = html.replace('</head>', `
        <script src="/overlays/overlay-utils.js"></script>
        <script>
          window.addEventListener('load', function() {
            window.dispatchEvent(new CustomEvent('scorex:update', { 
              detail: ${JSON.stringify(demoData)} 
            }));
          });
        </script>
      </head>`);
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(html);
            return;
        }
        const apiBaseUrl = getBaseUrl();
        let html = fs_1.default.readFileSync(templatePath, 'utf8');
        html = html.replace('</head>', `
      <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
      <script src="/overlays/overlay-utils.js"></script>
      <script>
        window.OVERLAY_CONFIG = {
          matchId: ${JSON.stringify(matchId)},
          tournamentId: ${JSON.stringify(tournamentId)},
          apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
          overlayId: ${JSON.stringify(overlay?._id || null)},
          config: ${JSON.stringify(overlay?.config || {})},
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
    }
    catch (error) {
        console.error('serveOverlay error:', error);
        res.status(500).send('Server error');
    }
};
exports.serveOverlay = serveOverlay;
exports.default = {
    createOverlay: exports.createOverlay,
    getOverlays: exports.getOverlays,
    getOverlay: exports.getOverlay,
    updateOverlay: exports.updateOverlay,
    deleteOverlay: exports.deleteOverlay,
    getOverlayTemplates: exports.getOverlayTemplates,
    getMembershipStatus: exports.getMembershipStatus,
    serveOverlay: exports.serveOverlay,
    regenerateOverlayUrl: exports.regenerateOverlayUrl
};
