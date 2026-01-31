    import express from 'express';
    import { getNotifications, markAsRead } from '../controllers/notificationController';
    import { protect } from '../middleware/auth';
    import { AuthRequest } from '../middleware/auth';

    const router = express.Router();

    // router.get('/', protect, getNotifications);
    // router.put('/:id/read', protect, markAsRead);

    export default router;