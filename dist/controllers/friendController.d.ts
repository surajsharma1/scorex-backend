import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const sendFriendRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const acceptFriendRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const rejectFriendRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getFriends: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getFriendRequests: (req: Request, res: Response) => Promise<void>;
export declare const removeFriend: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=friendController.d.ts.map