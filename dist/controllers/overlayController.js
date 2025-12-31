"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveOverlay = exports.deleteOverlay = exports.updateOverlay = exports.createOverlay = exports.getOverlay = exports.getOverlays = void 0;
const uuid_1 = require("uuid");
const Overlay_1 = __importDefault(require("../models/Overlay"));
const getOverlays = async (req, res) => {
    try {
        const overlays = await Overlay_1.default.find({ createdBy: req.user._id })
            .populate('tournament');
        res.json(overlays);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOverlays = getOverlays;
const getOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findById(req.params.id);
        if (!overlay) {
            return res.status(404).json({ message: 'Overlay not found' });
        }
        res.json(overlay);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOverlay = getOverlay;
const createOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.create({
            ...req.body,
            publicId: (0, uuid_1.v4)(),
            createdBy: req.user._id
        });
        res.status(201).json(overlay);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOverlay = createOverlay;
const updateOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!overlay) {
            return res.status(404).json({ message: 'Overlay not found' });
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
        const overlay = await Overlay_1.default.findByIdAndDelete(req.params.id);
        if (!overlay) {
            return res.status(404).json({ message: 'Overlay not found' });
        }
        res.json({ message: 'Overlay deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteOverlay = deleteOverlay;
const serveOverlay = async (req, res) => {
    try {
        const overlay = await Overlay_1.default.findOne({ publicId: req.params.id })
            .populate('tournament');
        if (!overlay) {
            return res.status(404).send('Overlay not found');
        }
        const tournamentName = overlay.tournament?.name || 'Tournament';
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cricket Overlay</title>
          <style>
            body { margin: 0; font-family: ${overlay.config.fontFamily}; }
            .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
            .content { position: absolute; ${overlay.config.position}: 20px; left: 20px; right: 20px; background: ${overlay.config.backgroundColor}; padding: 20px; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="overlay">
            <div class="content">
              <h2>${tournamentName}</h2>
              <p>Overlay ID: ${overlay.publicId}</p>
            </div>
          </div>
        </body>
      </html>
    `;
        res.send(html);
    }
    catch (error) {
        res.status(500).send('Server error');
    }
};
exports.serveOverlay = serveOverlay;
exports.default = { serveOverlay: exports.serveOverlay };
//# sourceMappingURL=overlayController.js.map