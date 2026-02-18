import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
export declare const updateUserRole: (req: Request, res: Response) => Promise<void>;
export declare const getNotificationPreferences: (req: Request, res: Response) => Promise<void>;
export declare const updateNotificationPreferences: (req: Request, res: Response) => Promise<void>;
export declare const getProfile: (req: Request, res: Response) => Promise<void>;
export declare const updateProfile: (req: Request, res: Response) => Promise<void>;
export declare const searchUsers: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map