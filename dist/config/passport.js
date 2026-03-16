"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const User_1 = __importDefault(require("../models/User"));
// Serialize User: stores user ID in the session (if using sessions)
// Since we use JWTs, this is mostly for compatibility or if you implement session-based auth later.
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.default.findById(id);
        done(null, user);
    }
    catch (err) {
        done(err, null);
    }
});
/*
 * LEGACY PASSPORT CONFIG - DEPRECATED
 * GoogleStrategy moved inline to server.ts for better env control
 * Keeping serialize/deserialize for session compatibility
 */
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.default.findById(id);
        done(null, user);
    }
    catch (err) {
        done(err, null);
    }
});
/* GoogleStrategy configuration removed - handled in server.ts
console.log('Legacy passport.ts loaded - Google strategy deprecated');
*/
exports.default = passport_1.default;
