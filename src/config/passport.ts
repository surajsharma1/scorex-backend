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

// --- GOOGLE STRATEGY ---
// Only configure if environment variables are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`,
        passReqToCallback: true // Allows us to pass the req object to the callback
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0].value;
          const googleId = profile.id;
          const fullName = profile.displayName;

          if (!email) {
            return done(new Error("No email found from Google"), undefined);
          }

          // 1. Check if user exists by googleId
          let user = await User.findOne({ googleId });

          if (user) {
            return done(null, user);
          }

          // 2. Check if user exists by email
          user = await User.findOne({ email });

          if (user) {
            // If user exists but isn't linked to Google, link them
            if (!user.googleId) {
              user.googleId = googleId;
              // Update fullName if not set
              if (!user.fullName && fullName) {
                user.fullName = fullName;
              }
              await user.save();
            }
            return done(null, user);
          } else {
            // 3. If user doesn't exist, create a new user
            const newUser = await User.create({
              username: email.split('@')[0], // Use email prefix as username (let user complete)
              email: email,
              googleId: googleId,
              fullName: fullName,
              isVerified: true, // Google verified email
              role: 'viewer',
              password: undefined, // No password for Google users
              // Username will be completed in frontend Register
            });
            return done(null, newUser);
          }
        } catch (err) {
          console.error("Google Auth Error:", err);
          return done(err, undefined);
        }
      }
    )
  );
  console.log('Google OAuth strategy configured');
} else {
  console.warn('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
}

export default passport;
