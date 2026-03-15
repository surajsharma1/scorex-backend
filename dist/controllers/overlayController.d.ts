/**
 * Overlay Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. createOverlay never set the required `html` field — Overlay.create() threw
 *    a Mongoose validation error every time an overlay was saved.
 *    FIX: set html to a minimal placeholder derived from the template name.
 *
 * 2. serveOverlay decoded the JWT with atob(token.split('.')[1]) — this is
 *    completely insecure; it never verifies the signature so any attacker can
 *    forge a token and get any membership level they want.
 *    FIX: use jwt.verify() with the same JWT_SECRET used everywhere else.
 *
 * 3. createOverlay and all handlers used (req as any).user._id —
 *    auth middleware sets req.user.id (a string). Fixed throughout.
 */
import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const regenerateOverlayUrl: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createOverlay: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getOverlays: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getOverlay: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateOverlay: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteOverlay: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getOverlayTemplates: (req: Request, res: Response) => Promise<void>;
export declare const getMembershipStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const serveOverlay: (req: Request, res: Response) => Promise<void>;
declare const _default: {
    createOverlay: (req: AuthRequest, res: Response) => Promise<void>;
    getOverlays: (req: AuthRequest, res: Response) => Promise<void>;
    getOverlay: (req: AuthRequest, res: Response) => Promise<void>;
    updateOverlay: (req: AuthRequest, res: Response) => Promise<void>;
    deleteOverlay: (req: AuthRequest, res: Response) => Promise<void>;
    getOverlayTemplates: (req: Request, res: Response) => Promise<void>;
    getMembershipStatus: (req: AuthRequest, res: Response) => Promise<void>;
    serveOverlay: (req: Request, res: Response) => Promise<void>;
    regenerateOverlayUrl: (req: AuthRequest, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=overlayController.d.ts.map