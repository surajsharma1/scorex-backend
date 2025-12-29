import { Request, Response } from 'express';
export declare const createTeam: (req: Request, res: Response) => Promise<void>;
export declare const getTeams: (req: Request, res: Response) => Promise<void>;
export declare const updateTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addPlayer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=teamController.d.ts.map