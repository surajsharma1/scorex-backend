/**
 * Notification Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. Used (req as any).user._id — auth middleware sets req.user.id
 * 2. Was concatenated with clubController.ts in original file
 */
import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getNotifications: (req: AuthRequest, res: Response) => Promise<void>;
export declare const markAsRead: (req: AuthRequest, res: Response) => Promise<void>;
export declare const markAllAsRead: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=notificationController.d.ts.map