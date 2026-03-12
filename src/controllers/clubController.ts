/**
 * Club Controller
 * Club management with roles
 * Following PROJECT_ALGORITHM.md specifications
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Club from '../models/Club';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all clubs
// @route   GET /api/v1/clubs
// @access  Public
export const getClubs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, search, limit = 20, page = 1 } = req.query;
    
    const query: any = { isActive: true };
    
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clubs = await Club.find(query)
      .populate('owner', 'username email fullName')
      .populate('members', 'username email fullName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Club.countDocuments(query);
    
    res.json({
      success: true,
      data: clubs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single club
// @route   GET /api/v1/clubs/:id
// @access  Public
export const getClub = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('owner', 'username email fullName profilePicture')
      .populate('members', 'username email fullName profilePicture')
      .populate('viceLeaders', 'username email fullName profilePicture')
      .populate('joinRequests', 'username email fullName');
    
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }
    
    res.json({
      success: true,
      data: club
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create club
// @route   POST /api/v1/clubs
// @access  Private
export const createClub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, logo, type, location, isPublic } = req.body;
    
    const club = await Club.create({
      name,
      description,
      logo,
      type: type || 'public',
      location,
      isPublic: isPublic !== false,
      owner: req.user?.id,
      members: [req.user?.id],
      viceLeaders: [],
      joinRequests: []
    });
    
    await club.populate('owner', 'username email');
    
    res.status(201).json({
      success: true,
      message: 'Club created successfully',
      data: club
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update club
// @route   PUT /api/v1/clubs/:id
// @access  Private (Owner/Vice-Leader)
export const updateClub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const club = await Club.findById(req.params.id);
    
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
        message: 'Not authorized to update this club'
      });
    }
    
    const { name, description, logo, type, location, isPublic } = req.body;
    
    if (name) club.name = name;
    if (description) club.description = description;
    if (logo) club.logo = logo;
    if (type) club.type = type;
    if (location) club.location = location;
    if (isPublic !== undefined) club.isPublic = isPublic;
    
    await club.save();
    
    res.json({
      success: true,
      message: 'Club updated',
      data: club
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete club
// @route   DELETE /api/v1/clubs/:id
// @access  Private (Owner only)
export const deleteClub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const club = await Club.findById(req.params.id);
    
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }
    
    if (club.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only owner can delete club'
      });
    }
    
    club.isActive = false;
    await club.save();
    
    res.json({
      success: true,
      message: 'Club deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join club
// @route   POST /api/v1/clubs/:id/join
// @access  Private
export const joinClub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const club = await Club.findById(req.params.id);
    
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }
    
    if (club.members.some((m: any) => m.toString() === req.user?.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this club'
      });
    }
    
    if (club.joinRequests.some((r: any) => r.toString() === req.user?.id)) {
      return res.status(400).json({
        success: false,
        message: 'Join request already pending'
      });
    }
    
    if (club.isPublic) {
      club.members.push(new mongoose.Types.ObjectId(req.user?.id));
      await club.save();
      
      res.json({
        success: true,
        message: 'Joined club successfully'
      });
    } else {
      club.joinRequests.push(new mongoose.Types.ObjectId(req.user!.id));

      await club.save();
      
      res.json({
        success: true,
        message: 'Join request submitted'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Leave club
// @route   POST /api/v1/clubs/:id/leave
// @access  Private
export const leaveClub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const club = await Club.findById(req.params.id);
    
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }
    
    if (club.owner.toString() === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave club'
      });
    }
    
    club.members = club.members.filter((m: any) => m.toString() !== req.user?.id);
    club.viceLeaders = club.viceLeaders.filter((v: any) => v.toString() !== req.user?.id);
    club.joinRequests = club.joinRequests.filter((r: any) => r.toString() !== req.user?.id);
    
    await club.save();
    
    res.json({
      success: true,
      message: 'Left club successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve join request
// @route   POST /api/v1/clubs/:id/approve/:userId
// @access  Private (Owner/Vice-Leader)
export const approveJoinRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    const club = await Club.findById(req.params.id);
    
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
        message: 'Not authorized'
      });
    }
    
    if (!club.joinRequests.some((r: any) => r.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'No join request from this user'
      });
    }
    
club.members.push(new mongoose.Types.ObjectId(userId));
    club.joinRequests = club.joinRequests.filter((r: any) => r.toString() !== userId);
    
    await club.save();
    
    res.json({
      success: true,
      message: 'Join request approved'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add vice leader
// @route   POST /api/v1/clubs/:id/vice-leader/:userId
// @access  Private (Owner only)
export const addViceLeader = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    const club = await Club.findById(req.params.id);
    
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }
    
    if (club.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only owner can add vice leaders'
      });
    }
    
    if (!club.members.some((m: any) => m.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User must be a member first'
      });
    }
    
    club.viceLeaders.push(new mongoose.Types.ObjectId(userId as string));
    await club.save();
    
    res.json({
      success: true,
      message: 'Vice leader added'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member
// @route   DELETE /api/v1/clubs/:id/members/:userId
// @access  Private (Owner/Vice-Leader)
export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    const club = await Club.findById(req.params.id);
    
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
        message: 'Not authorized'
      });
    }
    
    if (userId === club.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove owner'
      });
    }
    
    club.members = club.members.filter((m: any) => m.toString() !== userId);
    club.viceLeaders = club.viceLeaders.filter((v: any) => v.toString() !== userId);
    
    await club.save();
    
    res.json({
      success: true,
      message: 'Member removed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's clubs
// @route   GET /api/v1/clubs/my
// @access  Private
export const getMyClubs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clubs = await Club.find({
      $or: [
        { owner: req.user?.id },
        { members: req.user?.id }
      ],
      isActive: true
    })
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: clubs
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getClubs,
  getClub,
  createClub,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub,
  approveJoinRequest,
  addViceLeader,
  removeMember,
  getMyClubs
};
