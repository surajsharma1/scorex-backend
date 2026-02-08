import { Request, Response } from 'express';
export declare const createClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClubs: (req: Request, res: Response) => Promise<void>;
export declare const getClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const joinClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const leaveClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=clubController.d.ts.map