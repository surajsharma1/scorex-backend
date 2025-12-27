import express from 'express';
import {
  getOverlays,
  getOverlay,
  createOverlay,
  updateOverlay,
  deleteOverlay
} from '../controllers/overlayController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(protect, getOverlays)
  .post(protect, createOverlay);

router.route('/:id')
  .get(protect, getOverlay)
  .put(protect, updateOverlay)
  .delete(protect, deleteOverlay);

export default router;