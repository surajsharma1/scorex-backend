/**
 * User Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. All handlers used (req as any).user._id — auth middleware sets req.user.id
 * 2. searchUsers used req.user?._id — same fix
 */
import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getUsers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateUserRole: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getNotificationPreferences: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateNotificationPreferences: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const searchUsers: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=userController.d.ts.map