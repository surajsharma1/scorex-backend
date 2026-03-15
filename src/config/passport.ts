import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';

// Serialize User: stores user ID in the session (if using sessions)
// Since we use JWTs, this is mostly for compatibility or if you implement session-based auth later.
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* 
 * LEGACY PASSPORT CONFIG - DEPRECATED
 * GoogleStrategy moved inline to server.ts for better env control
 * Keeping serialize/deserialize for session compatibility 
 */
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* GoogleStrategy configuration removed - handled in server.ts
console.log('Legacy passport.ts loaded - Google strategy deprecated');
*/

export default passport;
