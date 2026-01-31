    import express from 'express';
    import { getNotifications, markAsRead } from '../controllers/notificationController';
    import { protect } from '../middleware/auth';
    import { AuthRequest } from '../middleware/auth';

    const router = express.Router();

    router.get('/', protect as any, getNotifications);
    router.put('/:id/read', protect as any, markAsRead);

    export default router;