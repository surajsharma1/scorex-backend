import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Overlay from '../models/Overlay';

export const getOverlays = async (req: Request, res: Response) => {
  try {
    const overlays = await Overlay.find({ createdBy: req.user!._id })
      .populate('tournament');
    res.json(overlays);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlay = async (req: Request, res: Response) => {
  try {
    const overlay = await Overlay.findById(req.params.id);
    if (!overlay) {
      return res.status(404).json({ message: 'Overlay not found' });
    }
    res.json(overlay);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createOverlay = async (req: Request, res: Response) => {
  try {
    const overlay = await Overlay.create({
      ...req.body,
      publicId: uuidv4(),
      createdBy: req.user!._id
    });
    res.status(201).json(overlay);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOverlay = async (req: Request, res: Response) => {
  try {
    const overlay = await Overlay.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!overlay) {
      return res.status(404).json({ message: 'Overlay not found' });
    }
    res.json(overlay);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteOverlay = async (req: Request, res: Response) => {
  try {
    const overlay = await Overlay.findByIdAndDelete(req.params.id);
    if (!overlay) {
      return res.status(404).json({ message: 'Overlay not found' });
    }
    res.json({ message: 'Overlay deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const serveOverlay = async (req: Request, res: Response) => {
  try {
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament');
    if (!overlay) {
      return res.status(404).send('Overlay not found');
    }

    // Generate HTML for overlay (simplified)
   const tournamentName = (overlay.tournament as any)?.name || 'Tournament';  // Fixed: Handle null tournament
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
  } catch (error) {
    res.status(500).send('Server error');
  }
};
export default { serveOverlay };