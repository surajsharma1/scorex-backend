/**
 * Message Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. Entire persistence was in-memory Map — all messages lost on server restart
 *    — Now uses the Message mongoose model that already exists in the codebase
 * 2. Used (req as any).user._id — auth middleware sets req.user.id (string), not ._id
 * 3. Response format was inconsistent with rest of API (no success wrapper)
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getConversations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getMessages: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const sendMessage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const markAsRead: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteMessage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
declare const _default: {
    getConversations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getMessages: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    sendMessage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    markAsRead: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteMessage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
};
export default _default;
//# sourceMappingURL=messageController.d.ts.map