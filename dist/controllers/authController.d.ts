/**
 * Auth Controller
 * Complete authentication system with email validation, OAuth, JWT
 * Following PROJECT_ALGORITHM.md specifications
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const register: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMe: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const googleAuth: (req: Request, res: Response) => void;
export declare const googleCallback: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const githubAuth: (req: Request, res: Response) => void;
export declare const githubCallback: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const logout: (req: AuthRequest, res: Response) => Promise<void>;
declare const _default: {
    register: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    login: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    getMe: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    changePassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    googleAuth: (req: Request, res: Response) => void;
    googleCallback: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    githubAuth: (req: Request, res: Response) => void;
    githubCallback: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    logout: (req: AuthRequest, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=authController.d.ts.map