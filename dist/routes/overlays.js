"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const overlayController_1 = require("../controllers/overlayController");
const auth_1 = require("../middleware/auth");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// ── Public preview route — serves any template with mock data injected ────────
// Used by MembershipPreview and Membership modal floating preview
// No auth required, no DB lookup — just renders the template file with demo data
// URL: GET /api/v1/overlays/preview?template=lvl1-modern-bar.html
router.get('/preview', (req, res) => {
    const templateParam = req.query.template || 'lvl1-modern-bar';
    const templateFile = templateParam.endsWith('.html') ? templateParam : `${templateParam}.html`;
    // Sanitize - only allow safe filenames
    if (!/^[a-zA-Z0-9\-_.]+\.html$/.test(templateFile)) {
        return res.status(400).send('Invalid template name');
    }
    const searchPaths = [
        path_1.default.resolve(process.cwd(), 'public/overlays'),
        path_1.default.resolve(process.cwd(), '../public/overlays'),
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
        return res.status(404).send(`Template not found: ${templateFile}`);
    }
    const progress = Math.max(0, Math.min(100, parseInt(req.query.progress) || 75));
    const demoData = {
        matchName: 'ScoreX Premium Showcase',
        tournamentName: 'PREVIEW MODE',
        team1Name: 'MI MUMBAI',
        team2Name: 'CSK CHENNAI',
        team1Score: Math.round(187 * (progress / 100)),
        team1Wickets: Math.round(4 * (progress / 100)),
        team1Overs: `${Math.round(20 * (progress / 100))}.0`,
        strikerName: 'R. Sharma',
        strikerRuns: Math.round(72 * (progress / 100)),
        strikerBalls: Math.round(41 * (progress / 100)),
        nonStrikerName: 'H. Pandya',
        nonStrikerRuns: Math.round(18 * (progress / 100)),
        nonStrikerBalls: Math.round(9 * (progress / 100)),
        bowlerName: 'J. Bumrah',
        bowlerRuns: Math.round(28 * (progress / 100)),
        bowlerWickets: Math.round(2 * (progress / 100)),
        bowlerOvers: '3.4',
        thisOver: ['1', '4', '•', '6', '1', 'W'],
        totalFours: 9,
        totalSixes: 4,
        target: 188,
        runRate: '8.44',
        requiredRunRate: '9.23',
        sponsors: ['TATA', 'DREAM11', 'CEAT'],
        status: 'live',
    };
    try {
        let html = fs_1.default.readFileSync(templatePath, 'utf8');
        html = html.replace('</head>', `
      <script>
        (function() {
          var data = ${JSON.stringify(demoData)};
          function dispatch() {
            window.dispatchEvent(new CustomEvent('scorex:update', { detail: data }));
            window.postMessage({ type: 'UPDATE_SCORE', data: data, raw: {} }, '*');
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { setTimeout(dispatch, 150); });
          } else {
            setTimeout(dispatch, 150);
          }
        })();
      </script>
    </head>`);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(html);
    }
    catch {
        res.status(500).send('Failed to read template');
    }
});
// ── Public route for serving the overlay HTML (OBS/Browser Source) ─────────
router.get('/public/:id', overlayController_1.serveOverlay);
// ── Adblocker-evasion alias ──────────────────────────────────────────────────
router.options('/o/pub/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});
router.get('/o/pub/:id', overlayController_1.serveOverlay);
// ── Public routes ────────────────────────────────────────────────────────────
router.get('/templates', auth_1.protect, overlayController_1.getOverlayTemplates);
router.get('/membership-status', auth_1.protect, overlayController_1.getMembershipStatus);
// ── Protected CRUD routes ────────────────────────────────────────────────────
router.get('/', auth_1.protect, overlayController_1.getOverlays);
router.post('/', auth_1.protect, overlayController_1.createOverlay);
router.get('/:id', auth_1.protect, overlayController_1.getOverlay);
router.put('/:id', auth_1.protect, overlayController_1.updateOverlay);
router.delete('/:id', auth_1.protect, overlayController_1.deleteOverlay);
router.post('/:id/regenerate-url', auth_1.protect, overlayController_1.regenerateOverlayUrl);
exports.default = router;
