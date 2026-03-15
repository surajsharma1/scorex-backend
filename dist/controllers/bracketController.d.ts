/**
 * Bracket Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. getBrackets/createBracket used (req as any).user?._id — middleware sets req.user.id
 */
import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getBrackets: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createBracket: (req: AuthRequest, res: Response) => Promise<void>;
export declare const generateBracket: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateBracket: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteBracket: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=bracketController.d.ts.map