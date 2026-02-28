import { Request, Response } from 'express';
export declare const createPaymentIntent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createSubscription: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const processPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const confirmPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPaymentHistory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=paymentController.d.ts.map