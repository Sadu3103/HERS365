import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import { eq } from 'drizzle-orm';
import { db } from './db';
import * as schema from './schema';
import * as auth from './auth';

export function isGitHubOAuthConfigured(): boolean {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function configurePassport(): void {
  if (!isGitHubOAuthConfigured()) return;

  const callbackURL =
    process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/auth/github/callback';

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        callbackURL,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) return done(new Error('GitHub did not return an email'));

          const name = profile.displayName || profile.username || email.split('@')[0];
          const [existing] = await db
            .select()
            .from(schema.players)
            .where(eq(schema.players.email, email))
            .limit(1);

          const userId = existing
            ? existing.id
            : (await db.insert(schema.players).values({ email, name }).returning({ id: schema.players.id }))[0].id;

          done(null, { userId, email, name, role: 'athlete' as auth.UserRole });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}
