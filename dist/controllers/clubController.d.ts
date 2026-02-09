import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createClub: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClubs: (req: Request, res: Response) => Promise<void>;
export declare const getClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const joinClub: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const leaveClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateClub: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=clubController.d.ts.map