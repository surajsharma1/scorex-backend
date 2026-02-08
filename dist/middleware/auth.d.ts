import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
export interface AuthRequest extends Request {
    user?: IUser;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const authorize: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const protectOrganizer: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const protectAdmin: ((req: AuthRequest, res: Response, next: NextFunction) => void)[];
export declare const requirePermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map