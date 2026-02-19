"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveOverlay = exports.deleteOverlay = exports.updateOverlay = exports.getOverlay = exports.getOverlays = exports.createOverlay = void 0;
const uuid_1 = require("uuid");
const Overlay_1 = __importDefault(require("../models/Overlay"));
const createOverlay = async (req, res) => {
    try {
        const user = req.user;
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
        const overlayData = {
            name: name.trim(),
            template: template.trim(),
            config,
            elements: elements || [],
            publicId: (0, uuid_1.v4)(),
            createdBy: user._id,
        };
        if (tournament) {
            if (mongoose.Types.ObjectId.isValid(tournament)) {
                overlayData.tournament = new mongoose.Types.ObjectId(tournament);
            }
            else {
                res.status(400).json({ message: 'Invalid tournament ID format' });
                return;
            }
        }
        if (match) {
            if (mongoose.Types.ObjectId.isValid(match)) {
                overlayData.match = new mongoose.Types.ObjectId(match);
            }
            else {
                res.status(400).json({ message: 'Invalid match ID format' });
                return;
            }
        }
        const overlay = await Overlay_1.default.create(overlayData);
        res.status(201).json(overlay);
    }
    catch (error) {
        console.error('Overlay creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOverlay = createOverlay;
const getOverlays = async (req, res) => {
    try {
        const user = req.user;
        console.log('[getOverlays] User:', user);
        // Return 401 if user is not authenticated instead of silently returning empty array
        if (!user || !user._id) {
            console.log('[getOverlays] No user found or user not authenticated');
            res.status(401).json({ message: 'Not authorized, please log in' });
            return;
        }
        const overlays = await Overlay_1.default.find({ createdBy: user._id })
            .populate('tournament')
            .populate('match');
        console.log('[getOverlays] Found overlays:', overlays.length);
        res.json(overlays);
    }
    catch (error) {
        console.error('Get overlays error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOverlays = getOverlays;
const getOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findById(req.params.id);
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        res.json(overlay);
    }
    catch (error) {
        console.error('Get overlay error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOverlay = getOverlay;
const updateOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        res.json(overlay);
    }
    catch (error) {
        console.error('Update overlay error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateOverlay = updateOverlay;
const deleteOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findByIdAndDelete(req.params.id);
        if (!overlay) {
            res.status(404).json({ message: 'Overlay not found' });
            return;
        }
        res.json({ message: 'Overlay deleted' });
    }
    catch (error) {
        console.error('Delete overlay error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteOverlay = deleteOverlay;
const serveOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findOne({ publicId: req.params.id })
            .populate('tournament')
            .populate('match');
        if (!overlay) {
            res.status(404).send('Overlay not found');
            return;
        }
        const templateId = overlay.template || 'modern';
        const matchId = overlay.match?._id || overlay.match;
        const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
        const fs = require('fs');
        const path = require('path');
        const possiblePaths = [
            path.resolve(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays'),
            path.resolve(__dirname, '../../scorex-frontend/public/overlays'),
            path.resolve(__dirname, '../../../scorex-frontend/public/overlays'),
        ].filter(Boolean);
        let templatePath = '';
        let templateFound = false;
        for (const overlaysDir of possiblePaths) {
            const testPath = path.join(overlaysDir, `${templateId}.html`);
            console.log('Checking template at:', testPath);
            if (fs.existsSync(testPath)) {
                templatePath = testPath;
                templateFound = true;
                console.log('Template found at:', templatePath);
                break;
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
        }
        else {
            console.log(`Template not found: ${templatePath}, using fallback`);
            const Team = require('../models/Team').default;
            const teams = overlay.tournament?._id
                ? await Team.find({ tournament: overlay.tournament._id }).limit(2)
                : [];
            const liveScores = overlay.tournament?.liveScores || {};
            const team1 = teams[0] || {};
            const team2 = teams[1] || {};
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${overlay.name}</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: transparent; overflow: hidden; }
        .overlay-container { position: absolute; top: 20px; left: 20px; right: 20px; background: #16a34a; opacity: 0.9; border-radius: 8px; padding: 16px; color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
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
        setTimeout(() => { window.location.reload(); }, 1500);
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
    }
    catch (error) {
        console.error('Serve overlay error:', error);
        res.status(500).send('Error serving overlay');
    }
};
exports.serveOverlay = serveOverlay;
//# sourceMappingURL=overlayController.js.map