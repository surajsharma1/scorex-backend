import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Club from '../models/Club';
import upload from '../middleware/upload';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Upload club logo
// @route   POST /api/v1/clubs/:clubId/upload-logo
// @access  Private (Owner/Vice-Leader)
export const uploadLogo = [
  upload.single('logo'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const club = await Club.findById(req.params.clubId);
      
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }
      
      const isOwner = club.owner.toString() === req.user?.id;
      const isViceLeader = club.viceLeaders.some((v: any) => v.toString() === req.user?.id);
      
      if (!isOwner && !isViceLeader && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to upload images'
        });
      }
      
      if (req.file) {
        club.logo = `/uploads/${req.file.filename}`;
        await club.save();
        
        res.json({
          success: true,
          message: 'Logo uploaded successfully',
          data: { logo: club.logo }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
    } catch (error) {
      next(error);
    }
  }
];

// @desc    Upload club banner
// @route   POST /api/v1/clubs/:clubId/upload-banner
// @access  Private (Owner/Vice-Leader)
export const uploadBanner = [
  upload.single('banner'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const club = await Club.findById(req.params.clubId);
      
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }
      
      const isOwner = club.owner.toString() === req.user?.id;
      const isViceLeader = club.viceLeaders.some((v: any) => v.toString() === req.user?.id);
      
      if (!isOwner && !isViceLeader && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to upload images'
        });
      }
      
      if (req.file) {
        club.banner = `/uploads/${req.file.filename}`;
        await club.save();
        
        res.json({
          success: true,
          message: 'Banner uploaded successfully',
          data: { banner: club.banner }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
    } catch (error) {
      next(error);
    }
  }
];

export default {
  uploadLogo,
  uploadBanner
};

