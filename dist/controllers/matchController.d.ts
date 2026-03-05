import { Request, Response, NextFunction } from 'express';
export declare const createMatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const startMatch: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const scoreBall: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const undoLastBall: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMatchById: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=matchController.d.ts.map