import { Request, Response } from 'express';
export declare const getBrackets: (req: Request, res: Response) => Promise<void>;
export declare const createBracket: (req: Request, res: Response) => Promise<void>;
export declare const generateBracket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateBracket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteBracket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=bracketController.d.ts.map