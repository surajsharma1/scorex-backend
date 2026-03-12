import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getUpcomingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getOngoingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getFeaturedTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTournament: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const createTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const addTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const removeTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const generateBracket: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const startTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const endTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentMatches: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const getMyOrganizedTournaments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const searchTournaments: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
declare const _default: {
    getTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUpcomingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOngoingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFeaturedTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTournament: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    createTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    deleteTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    addTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    removeTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    generateBracket: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    startTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    endTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getTournamentStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getTournamentMatches: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    getMyOrganizedTournaments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    searchTournaments: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
};
export default _default;
//# sourceMappingURL=tournamentController.d.ts.map