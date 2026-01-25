import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getMatches: (req: Request, res: Response) => Promise<void>;
export declare const createMatch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateMatch: (req: Request, res: Response) => Promise<void>;
export declare const deleteMatch: (req: Request, res: Response) => Promise<void>;
export declare const updateMatchScore: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=matchController.d.ts.map