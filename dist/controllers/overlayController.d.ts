import { Request, Response } from 'express';
export declare const getOverlays: (req: Request, res: Response) => Promise<void>;
export declare const getOverlay: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createOverlay: (req: Request, res: Response) => Promise<void>;
export declare const updateOverlay: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteOverlay: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const serveOverlay: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {
    serveOverlay: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
export default _default;
//# sourceMappingURL=overlayController.d.ts.map