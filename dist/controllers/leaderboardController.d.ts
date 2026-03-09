/**
 * Leaderboard Controller
 * Global and tournament leaderboards
 * Following PROJECT_ALGORITHM.md specifications
 */
import { Request, Response, NextFunction } from 'express';
export declare const getGlobalLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTournamentLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getMatchLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getOrangeCap: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPurpleCap: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getGlobalLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTournamentLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getMatchLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getOrangeCap: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPurpleCap: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=leaderboardController.d.ts.map