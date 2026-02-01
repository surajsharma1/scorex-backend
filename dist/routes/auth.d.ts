import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
declare const router: import("express-serve-static-core").Router;
export interface AuthRequest extends Request {
    user?: IUser;
}
export declare const protectAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const protectOrganizer: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const protectAdmin: ((req: AuthRequest, res: Response, next: NextFunction) => void)[];
export default router;
//# sourceMappingURL=auth.d.ts.map