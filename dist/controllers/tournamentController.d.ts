import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const createTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateBracket: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const startTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    createTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateBracket: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    startTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=tournamentController.d.ts.map