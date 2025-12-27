import express from 'express';
import multer from 'multer';
import { createTeam, getTeams, updateTeam, deleteTeam, addPlayer } from '../controllers/teamController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.route('/')
  .get(protect, getTeams)
  .post(protect, upload.single('logo'), createTeam);

router.route('/:id')
  .put(protect, upload.single('logo'), updateTeam)
  .delete(protect, deleteTeam);

router.post('/:id/players', protect, upload.single('image'), addPlayer);

export default router;