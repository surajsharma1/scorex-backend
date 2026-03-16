import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const register: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const login: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<void>;
export declare const logout: (req: AuthRequest, res: Response) => void;
export declare const forgotPassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const resetPassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const googleCallback: (req: any, res: Response) => Response<any, Record<string, any>>;
export declare const githubCallback: (req: any, res: Response) => Response<any, Record<string, any>>;
declare const _default: {
    register: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    login: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    logout: (req: AuthRequest, res: Response) => void;
    forgotPassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    resetPassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getMe: (req: AuthRequest, res: Response) => Promise<void>;
    googleCallback: (req: any, res: Response) => Response<any, Record<string, any>>;
    githubCallback: (req: any, res: Response) => Response<any, Record<string, any>>;
};
export default _default;
//# sourceMappingURL=authController.d.ts.map