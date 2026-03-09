/**
 * Tournament Controller
 * Tournament management with bracket generation
 * Following PROJECT_ALGORITHM.md specifications
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getUpcomingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getOngoingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getFeaturedTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTournament: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const removeTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const generateBracket: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const startTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const endTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTournamentStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyOrganizedTournaments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const searchTournaments: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {
    getTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUpcomingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOngoingTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFeaturedTournaments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTournament: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    createTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    deleteTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    addTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    removeTeam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    generateBracket: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    startTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    endTournament: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    getTournamentStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    getMyOrganizedTournaments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    searchTournaments: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
};
export default _default;
//# sourceMappingURL=tournamentController.d.ts.map