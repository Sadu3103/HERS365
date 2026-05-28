import express from 'express';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

// Configure Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
}, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
  try {
    console.log('Google OAuth successful for user:', profile.displayName);

    const user = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value,
      provider: 'google'
    };

    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Configure Passport GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/auth/github/callback'
}, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
  try {
    console.log('GitHub OAuth successful for user:', profile.displayName);

    const user = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value,
      provider: 'github'
    };

    return done(null, user);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done: any) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user: any, done: any) => {
  done(null, user);
});

// Create auth router
const authRouter = express.Router();

// Initialize Passport
authRouter.use(passport.initialize());
authRouter.use(passport.session());

// Google OAuth routes
authRouter.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'OAuth configuration missing',
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth` }),
  (req: any, res: any) => {
    const user = req.user as any;

    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider
    }));

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?user=${userData}`);
  }
);

// GitHub OAuth routes
authRouter.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'OAuth configuration missing',
      message: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.'
    });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

authRouter.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth` }),
  (req: any, res: any) => {
    const user = req.user as any;

    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider
    }));

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?user=${userData}`);
  }
);

export { authRouter, passport };