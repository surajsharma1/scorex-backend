import { Request, Response } from 'express';
export declare const regenerateOverlayUrl: (req: Request, res: Response) => Promise<void>;
export declare const createOverlay: (req: Request, res: Response) => Promise<void>;
export declare const getOverlays: (req: Request, res: Response) => Promise<void>;
export declare const getOverlay: (req: Request, res: Response) => Promise<void>;
export declare const updateOverlay: (req: Request, res: Response) => Promise<void>;
export declare const deleteOverlay: (req: Request, res: Response) => Promise<void>;
export declare const getOverlayTemplates: () => Promise<({
    id: string;
    name: string;
    level: number;
    description: string;
    type?: undefined;
} | {
    id: string;
    name: string;
    level: number;
    type: string;
    description: string;
})[]>;
export declare const serveOverlay: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=overlayController.d.ts.map