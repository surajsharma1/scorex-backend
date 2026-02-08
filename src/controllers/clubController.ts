import { Request, Response } from 'express';
import Club from '../models/Club';
import User from '../models/User';
import { logger } from '../utils/logger';

export const createClub = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ message: 'Club name is required' });
    }

    const club = new Club({
      name,
      description,
      members: [userId],
      createdBy: userId
    });

    await club.save();

    logger.info(`Club created: ${name} by ${userId}`);
    res.status(201).json({ message: 'Club created successfully', club });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Club name already exists' });
    }
    logger.error('Error creating club:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getClubs = async (req: Request, res: Response) => {
  try {
    const clubs = await Club.find()
      .populate('members', 'username profilePicture')
      .populate('createdBy', 'username');

    res.json({ clubs });
  } catch (error) {
    logger.error('Error getting clubs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getClub = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId)
      .populate('members', 'username profilePicture bio')
      .populate('createdBy', 'username');

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    res.json({ club });
  } catch (error) {
    logger.error('Error getting club:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const joinClub = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    if (club.members.includes(userId)) {
      return res.status(400).json({ message: 'Already a member of this club' });
    }

    club.members.push(userId);
    await club.save();

    logger.info(`User ${userId} joined club ${clubId}`);
    res.json({ message: 'Joined club successfully', club });
  } catch (error) {
    logger.error('Error joining club:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const leaveClub = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    if (!club.members.includes(userId)) {
      return res.status(400).json({ message: 'Not a member of this club' });
    }

    if (club.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Club creator cannot leave the club' });
    }

    club.members = club.members.filter(member => member.toString() !== userId);
    await club.save();

    logger.info(`User ${userId} left club ${clubId}`);
    res.json({ message: 'Left club successfully' });
  } catch (error) {
    logger.error('Error leaving club:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateClub = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    if (club.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only club creator can update the club' });
    }

    if (name) club.name = name;
    if (description !== undefined) club.description = description;

    await club.save();

    logger.info(`Club updated: ${clubId}`);
    res.json({ message: 'Club updated successfully', club });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Club name already exists' });
    }
    logger.error('Error updating club:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteClub = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    if (club.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only club creator can delete the club' });
    }

    await Club.findByIdAndDelete(clubId);

    logger.info(`Club deleted: ${clubId}`);
    res.json({ message: 'Club deleted successfully' });
  } catch (error) {
    logger.error('Error deleting club:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
