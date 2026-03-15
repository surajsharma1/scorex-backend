import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const createTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getTeams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTeam: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const updateTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const addPlayer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const removePlayer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
declare const _default: {
    createTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getTeams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTeam: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    updateTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    deleteTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    addPlayer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    removePlayer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
};
export default _default;
//# sourceMappingURL=teamController.d.ts.map