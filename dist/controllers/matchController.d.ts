/**
 * Match Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. updateMatch used invalid populate(array, 'select') syntax — split into separate calls
 * 2. endMatch used fire-and-forget .then() for team stats — replaced with await
 * 3. getLiveMatches / getUpcomingMatches cast to `any` for statics — use proper model
 * 4. endInnings pushed second innings with hardcoded team2 regardless of toss — now toss-aware
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMatch: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const createMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const updateMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const deleteMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const startMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const addBall: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const setStriker: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const setNonStriker: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const setBowler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const endInnings: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const endMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getLiveMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getUpcomingMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateMatchStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const setMatchOverlay: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
declare const _default: {
    getMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMatch: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    createMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    updateMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    deleteMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    startMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    addBall: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    setStriker: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    setNonStriker: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    setBowler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    endInnings: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    endMatch: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getLiveMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUpcomingMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMatchStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    setMatchOverlay: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
};
export default _default;
//# sourceMappingURL=matchController.d.ts.map