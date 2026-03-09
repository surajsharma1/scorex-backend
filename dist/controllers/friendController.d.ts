/**
 * Friend Controller
 * Friends management system
 * Following PROJECT_ALGORITHM.md specifications
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getFriendRequests: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const sendFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const acceptFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const rejectFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const removeFriend: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const searchUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getOnlineFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getFriendRequests: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    sendFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    acceptFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    rejectFriendRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    removeFriend: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    searchUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    getOnlineFriends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=friendController.d.ts.map