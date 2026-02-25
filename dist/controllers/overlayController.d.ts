import { Request, Response } from 'express';
export declare const createOverlay: (req: Request, res: Response) => Promise<void>;
export declare const getOverlays: (req: Request, res: Response) => Promise<void>;
export declare const getOverlay: (req: Request, res: Response) => Promise<void>;
export declare const updateOverlay: (req: Request, res: Response) => Promise<void>;
export declare const deleteOverlay: (req: Request, res: Response) => Promise<void>;
/**
 * Generate a shareable URL for an overlay
 * This creates a public URL that can be used in OBS or browser sources
 */
export declare const generateOverlayUrl: (publicId: string, backendUrl?: string) => string;
/**
 * Get all available overlay templates
 * Updated to match actual files in /public/overlays/
 */
export declare const getOverlayTemplates: () => Promise<Array<{
    id: string;
    name: string;
    description: string;
}>>;
export declare const serveOverlay: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=overlayController.d.ts.map