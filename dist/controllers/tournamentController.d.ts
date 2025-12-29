import { Request, Response } from 'express';
export declare const createTournament: (req: Request, res: Response) => Promise<void>;
export declare const getTournaments: (req: Request, res: Response) => Promise<void>;
export declare const getTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const goLive: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateLiveScores: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=tournamentController.d.ts.map