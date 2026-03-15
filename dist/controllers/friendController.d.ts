/**
 * Friend Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. rejectFriendRequest set status to 'blocked' instead of 'rejected'
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getFriendRequests: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const sendFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const acceptFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const rejectFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const removeFriend: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const searchUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getOnlineFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getFriendRequests: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    sendFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    acceptFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    rejectFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    removeFriend: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    searchUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getOnlineFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=friendController.d.ts.map