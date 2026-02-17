import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getTournaments: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTournament: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createTournament: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateTournament: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteTournament: (req: AuthRequest, res: Response) => Promise<void>;
export declare const goLive: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateLiveScores: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=tournamentController.d.ts.map