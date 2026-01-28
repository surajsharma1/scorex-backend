import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getTournaments: (req: Request, res: Response) => Promise<void>;
export declare const getTournament: (req: Request, res: Response) => Promise<void>;
export declare const createTournament: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateTournament: (req: Request, res: Response) => Promise<void>;
export declare const deleteTournament: (req: Request, res: Response) => Promise<void>;
export declare const goLive: (req: Request, res: Response) => Promise<void>;
export declare const updateLiveScores: (req: Request, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=tournamentController.d.ts.map