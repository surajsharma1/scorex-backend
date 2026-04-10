import express from 'express';
import {
  getOverlays,
  getOverlay,
  createOverlay,
  updateOverlay,
  deleteOverlay,
  getOverlayTemplates,
  serveOverlay,
  getMembershipStatus,
  regenerateOverlayUrl,
} from '../controllers/overlayController';
import { protect } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ── Public preview route — serves any template with mock data injected ────────
// Used by MembershipPreview and Membership modal floating preview
// No auth required, no DB lookup — just renders the template file with demo data
// URL: GET /api/v1/overlays/preview?template=lvl1-modern-bar.html
router.get('/preview', (req, res) => {
  const templateParam = (req.query.template as string) || 'lvl1-modern-bar';
  const templateFile = templateParam.endsWith('.html') ? templateParam : `${templateParam}.html`;

  // Sanitize - only allow safe filenames
  if (!/^[a-zA-Z0-9\-_.]+\.html$/.test(templateFile)) {
    return res.status(400).send('Invalid template name');
  }

  const searchPaths = [
    path.resolve(process.cwd(), 'public/overlays'),
    path.resolve(process.cwd(), '../public/overlays'),
    path.resolve(__dirname, '../../public/overlays'),
    path.resolve(__dirname, '../../../public/overlays'),
  ];

  let templatePath: string | null = null;
  for (const dir of searchPaths) {
    const candidate = path.join(dir, templateFile);
    if (fs.existsSync(candidate)) { templatePath = candidate; break; }
  }

  if (!templatePath) {
    return res.status(404).send(`Template not found: ${templateFile}`);
  }

  const progress = Math.max(0, Math.min(100, parseInt(req.query.progress as string) || 75));

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
    let html = fs.readFileSync(templatePath, 'utf8');
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
  } catch {
    res.status(500).send('Failed to read template');
  }
});

// ── Public route for serving the overlay HTML (OBS/Browser Source) ─────────
router.get('/public/:id', serveOverlay);

// ── Adblocker-evasion alias ──────────────────────────────────────────────────
router.options('/o/pub/:id', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});
router.get('/o/pub/:id', serveOverlay);

// ── Public routes ────────────────────────────────────────────────────────────
router.get('/templates', protect as any, getOverlayTemplates);
router.get('/membership-status', protect as any, getMembershipStatus);

// ── Protected CRUD routes ────────────────────────────────────────────────────
router.get('/', protect as any, getOverlays as any);
router.post('/', protect as any, createOverlay as any);
router.get('/:id', protect as any, getOverlay as any);
router.put('/:id', protect as any, updateOverlay as any);
router.delete('/:id', protect as any, deleteOverlay as any);
router.post('/:id/regenerate-url', protect as any, regenerateOverlayUrl as any);

export default router;
