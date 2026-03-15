/**
 * server.ts — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. dotenv.config() was called on line 44, AFTER imports on lines 1-40 that
 *    read process.env.* at import time (e.g. database.ts reads MONGODB_URI,
 *    passport reads GOOGLE_CLIENT_ID, etc.) — env vars were all undefined
 *    when those modules initialised.
 *    FIX: dotenv.config() is now the very first statement in the file.
 *
 * 2. /api/auth/auto-login route created an admin user with a plaintext
 *    password and exposed a token to anyone who hit the endpoint — a trivial
 *    auth bypass in production.
 *    FIX: route removed entirely.
 */
import { Server } from 'socket.io';
import './models/index';
declare const app: import("express-serve-static-core").Express;
export declare const io: Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export default app;
//# sourceMappingURL=server.d.ts.map