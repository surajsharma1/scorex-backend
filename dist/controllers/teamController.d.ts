/**
 * Team Controller
 * Team and player management
 * Following PROJECT_ALGORITHM.md specifications
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getTeams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTeam: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const createTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const addPlayer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const removePlayer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getTeamPlayers: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getUserTeams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const searchTeams: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=teamController.d.ts.map