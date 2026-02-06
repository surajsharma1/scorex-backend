import { Server } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
export declare const io: Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const createLimiter: import("express-rate-limit").RateLimitRequestHandler;
export default app;
//# sourceMappingURL=server.d.ts.map