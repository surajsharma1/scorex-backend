import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const searchUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getUser: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateMembership: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
declare const _default: {
    getUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUser: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateMembership: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
};
export default _default;
//# sourceMappingURL=userController.d.ts.map