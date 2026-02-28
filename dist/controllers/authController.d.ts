import { Request, Response } from 'express';
export declare const register: (((req: any, res: any, next: any) => any) | ((req: Request, res: Response) => Promise<void>))[];
export declare const login: (((req: any, res: any, next: any) => any) | ((req: Request, res: Response) => Promise<void>))[];
export declare const googleLogin: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map