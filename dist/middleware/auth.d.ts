import { Request, Response, NextFunction } from 'express';
export declare const protect: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const protectOrganizer: ((req: Request, res: Response, next: NextFunction) => void)[];
export declare const protectAdmin: ((req: Request, res: Response, next: NextFunction) => void)[];
//# sourceMappingURL=auth.d.ts.map