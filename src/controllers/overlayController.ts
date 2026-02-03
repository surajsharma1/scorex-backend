import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Overlay from '../models/Overlay';
import Tournament from '../models/Tournament';

export const createOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const overlayData = {
      ...req.body,
      publicId: uuidv4(),
      createdBy: user._id,
    };
    const overlay = await Overlay.create(overlayData);
    res.status(201).json(overlay);
  } catch (error) {
    console.error('Overlay creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlays = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlays = await Overlay.find({ createdBy: (req as any).user?._id })  // Type assertion
      .populate('tournament');
    res.json(overlays);
  } catch (error) {
    console.error('Get overlays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findById(req.params.id);
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

export const serveOverlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const overlay = await Overlay.findOne({ publicId: req.params.id })
      .populate('tournament') as any;
    if (!overlay) {
      res.status(404).send('Overlay not found');
      return;
    }
    const liveScores = overlay.tournament?.liveScores || {};
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
        // Auto-refresh every 5 seconds to get live updates
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    </script>
</head>
<body>
    <div class="overlay-container">
        <div class="score-section">
            <div class="team-info">
                <div class="team-name">${liveScores.team1?.name || 'Team 1'}</div>
                <div class="score">${liveScores.team1?.score || 0}/${liveScores.team1?.wickets || 0}</div>
                <div class="overs">${liveScores.team1?.overs || 0} overs</div>
            </div>
            <div class="vs-text">VS</div>
            <div class="team-info">
                <div class="team-name">${liveScores.team2?.name || 'Team 2'}</div>
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
  } catch (error) {
    console.error('Serve overlay error:', error);
    res.status(500).send('Error serving overlay');
  }
};