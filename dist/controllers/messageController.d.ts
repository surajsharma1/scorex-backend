import { Request, Response } from 'express';
export declare const getConversations: (req: Request, res: Response) => Promise<void>;
export declare const getMessages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const sendMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const markAsRead: (req: Request, res: Response) => Promise<void>;
export declare const deleteMessage: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=messageController.d.ts.map