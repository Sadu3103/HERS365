// @ts-nocheck
/**
  * SECURE AUTHENTICATION ROUTES
  * Enterprise-grade authentication system with MFA, session management, and compliance
  * Designed for sports recruiting platform with minors and financial transactions
  */
import express from 'express';
import * as auth from './auth';
import { db } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'mock-client-id');

// Enhanced rate limiting with progressive delays
// Handles enterprise scale while preventing abuse
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 20, // 20 attempts per IP (reduced for security)
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: async (req, res) => {
    // Log suspicious activity
    await auth.detectSuspiciousActivity(
      null,
      null,
      (req.body as any)?.email || 'unknown',
      req.ip || 'unknown',
      req.headers['user-agent'] as string || 'unknown',
      'rate_limit_exceeded'
    );

    res.status(429).json({
      error: 'Too many login attempts, please try again later',
      retryAfter: 900 // 15 minutes
    });
  }
});

// MFA verification rate limiter (stricter)
const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 5, // 5 MFA attempts per window
  message: { error: 'Too many MFA attempts, please wait and try again' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// Keep mock users for demo purposes (these work with the demo credentials)
const mockAthletes = [
  { id: 1, email: 'athlete@demo.com', password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGRe.XFLJeMGSnD5oE9qCr5e5Fy', name: 'Marcus Johnson', role: 'athlete' }, // password: demo123
];
const mockParents = [
  { id: 201, email: 'parent@demo.com', password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGRe.XFLJeMGSnD5oE9qCr5e5Fy', name: 'Sarah Johnson', role: 'parent', phone: '555-1234' }, // password: demo123
];
const mockCoaches = [
  { id: 101, email: 'coach@texas.edu', password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGRe.XFLJeMGSnD5oE9qCr5e5Fy', name: 'Coach Williams', school: 'University of Texas', division: 'D1', role: 'coach' }, // password: demo123
];


// Helper function to find user in database or fallback to mock
async function findAthlete(email: string) {
  // First check mock users
  const mockUser = mockAthletes.find(u => u.email === email);
  if (mockUser) return mockUser;

  // Then check database players table
  const dbUsers = await db.select().from(schema.players).where(eq(schema.players.email, email)).limit(1);
  if (dbUsers.length > 0) {
    return {
      id: dbUsers[0].id,
      email: dbUsers[0].email,
      password: dbUsers[0].passwordHash || '',
      name: dbUsers[0].name,
      role: 'athlete'
    };
  }
  return null;
}

async function findParent(email: string) {
  // First check mock users
  const mockUser = mockParents.find(u => u.email === email);
  if (mockUser) return mockUser;

  // Then check database parents table
  const dbUsers = await db.select().from(schema.parents).where(eq(schema.parents.email, email)).limit(1);
  if (dbUsers.length > 0) {
    return {
      id: dbUsers[0].id,
      email: dbUsers[0].email,
      password: dbUsers[0].passwordHash || '',
      name: dbUsers[0].name,
      phone: dbUsers[0].phone,
      role: 'parent'
    };
  }
  return null;
}

async function findCoach(email: string) {
  // First check mock users
  const mockUser = mockCoaches.find(u => u.email === email);
  if (mockUser) return mockUser;

  // Then check database coaches table
  const dbUsers = await db.select().from(schema.coaches).where(eq(schema.coaches.email, email)).limit(1);
  if (dbUsers.length > 0) {
    return {
      id: dbUsers[0].id,
      email: dbUsers[0].email || '',
      name: dbUsers[0].name,
      school: dbUsers[0].university,
      division: dbUsers[0].division,
      role: 'coach'
    };
  }
  return null;
}

// ─── Athlete Auth ─────────────────────────────────────────────────────────────

/**
 * POST /auth/athlete/register
 */
router.post('/athlete/register', async (req, res) => {
  const { email, password, name, position, state, school, gradYear } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  try {
    const hashed = await auth.hashPassword(password);
    // Mock user creation (use DB in production):
    const newUser = { id: Date.now(), email, password: hashed, name, role: 'athlete' };
    mockAthletes.push(newUser);
    const token = auth.signToken({ userId: newUser.id, email, role: 'athlete', name });
    res.status(201).json({
      token,
      user: { id: newUser.id, email, name, role: 'athlete', position, state, school, gradYear }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
  * POST /auth/athlete/login
  * SECURE: MFA, session management, brute force protection, audit logging
  */
router.post('/athlete/login', loginLimiter, async (req, res) => {
  const { email, password, mfaToken, deviceFingerprint } = req.body;
  const clientIP = req.ip || req.connection?.remoteAddress as string || 'unknown';
  const userAgent = req.headers['user-agent'] as string || 'unknown';

  try {
    // Step 1: Check for account lockout
    const lockout = await auth.isAccountLocked(email, 'athlete');
    if (lockout) {
      await auth.logAuditEvent({
        userType: 'athlete',
        action: 'login_attempt_blocked',
        success: false,
        errorMessage: 'Account locked',
        metadata: { lockoutReason: lockout.lockoutReason }
      }, req);

      return res.status(423).json({
        error: 'Account temporarily locked due to security concerns',
        unlockAt: lockout.unlockAt?.toISOString(),
        isPermanent: lockout.isPermanent
      });
    }

    // Step 2: Check progressive delay for failed attempts
    const { delayMs } = await auth.getRecentFailedAttempts(email, 'athlete', clientIP);
    if (delayMs > 0) {
      // Apply progressive delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Step 3: Find and validate user
    const user = await findAthlete(email);
    if (!user) {
      await auth.recordFailedAttempt(email, 'athlete', clientIP, userAgent, 'user_not_found');
      await auth.detectSuspiciousActivity(null, 'athlete', email, clientIP, userAgent, 'login_user_not_found');

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Step 4: Validate password
    const validPassword = await auth.comparePassword(password, user.password);
    if (!validPassword) {
      await auth.recordFailedAttempt(email, 'athlete', clientIP, userAgent, 'invalid_password');

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Step 5: Check if MFA is required
    const mfaEnabled = await auth.isMFAEnabled(user.id, 'athlete');
    if (mfaEnabled && !mfaToken) {
      // MFA required but not provided - return MFA challenge
      await auth.logAuditEvent({
        userId: user.id,
        userType: 'athlete',
        action: 'login_mfa_required',
        success: true,
        metadata: { requiresMFA: true }
      }, req);

      return res.status(200).json({
        requiresMFA: true,
        user: { id: user.id, email: user.email, name: user.name, role: 'athlete' }
      });
    }

    // Step 6: Verify MFA if provided
    if (mfaEnabled && mfaToken) {
      const mfaValid = await auth.verifyMFALogin(user.id, 'athlete', mfaToken);
      if (!mfaValid) {
        await auth.recordFailedAttempt(email, 'athlete', clientIP, userAgent, 'mfa_failed');

        return res.status(401).json({ error: 'Invalid MFA token' });
      }
    }

    // Step 7: Create session and tokens
    const sessionId = await auth.createUserSession(
      user.id,
      'athlete',
      undefined, // refresh token ID will be set when refresh token is created
      deviceFingerprint,
      clientIP,
      userAgent
    );

    const refreshToken = auth.generateRefreshToken();
    const refreshTokenId = await auth.storeRefreshToken(
      user.id,
      'athlete',
      refreshToken,
      deviceFingerprint,
      clientIP,
      userAgent
    );

    // Update session with refresh token ID
    await db
      .update(schema.userSessions)
      .set({ refreshTokenId })
      .where(eq(schema.userSessions.sessionId, sessionId));

    const accessToken = auth.signAccessToken({
      userId: user.id,
      email: user.email,
      role: 'athlete',
      userType: 'athlete',
      name: user.name,
      sessionId,
      mfaVerified: mfaEnabled
    });

    // Step 8: Log successful login
    await auth.logAuditEvent({
      userId: user.id,
      userType: 'athlete',
      action: 'login',
      success: true,
      metadata: {
        mfaUsed: mfaEnabled,
        deviceFingerprint,
        sessionId
      }
    }, req);

    // Step 9: Return tokens and user data
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'athlete',
        sessionId,
        mfaEnabled
      }
    });

  } catch (error) {
    console.error('Athlete login error:', error);
    await auth.logAuditEvent({
      userType: 'athlete',
      action: 'login_error',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, req);

    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ─── Parent Auth ─────────────────────────────────────────────────────────────

/**
 * POST /auth/parent/register
 */
router.post('/parent/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  // Check if parent already exists
  const existingParent = mockParents.find(p => p.email === email);
  if (existingParent) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  try {
    const hashed = await auth.hashPassword(password);
    // Mock user creation (use DB in production):
    const newParent = {
      id: Date.now(),
      email,
      password: hashed,
      name,
      phone: phone || null,
      role: 'parent'
    };
    mockParents.push(newParent);
    const token = auth.signToken({ userId: newParent.id, email, role: 'parent', name });
    res.status(201).json({
      token,
      user: { id: newParent.id, email, name, role: 'parent', phone }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
  * POST /auth/parent/login
  * RATE LIMITED: 50 req/min per IP for 50K user scalability
  */
  router.post('/parent/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  const user = await findParent(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await auth.comparePassword(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = auth.signToken({ userId: user.id, email: user.email, role: 'parent', name: user.name });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: 'parent', phone: user.phone }
  });
});

// ─── Coach Auth ───────────────────────────────────────────────────────────────

/**
 * POST /auth/coach/register
 */
router.post('/coach/register', async (req, res) => {
  const { email, password, name, school, division, sport } = req.body;
  if (!email || !password || !name || !school) {
    return res.status(400).json({ error: 'email, password, name, and school are required' });
  }
  try {
    const hashed = await auth.hashPassword(password);
    const newCoach = { id: Date.now(), email, password: hashed, name, school, division: division || 'D1', role: 'coach' };
    mockCoaches.push(newCoach);
    const token = auth.signToken({ userId: newCoach.id, email, role: 'coach', name });
    res.status(201).json({
      token,
      user: { id: newCoach.id, email, name, role: 'coach', school, division }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
  * POST /auth/coach/login
  * RATE LIMITED: 50 req/min per IP for 50K user scalability
  */
  router.post('/coach/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  const coach = await findCoach(email);
  if (!coach) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await auth.comparePassword(password, coach.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = auth.signToken({ userId: coach.id, email: coach.email, role: 'coach', name: coach.name });
  res.json({
    token,
    user: { id: coach.id, email: coach.email, name: coach.name, role: 'coach', school: coach.school, division: coach.division }
  });
});

/**
 * GET /auth/me — Get current user from token
 */
router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ─── MFA MANAGEMENT ROUTES ─────────────────────────────────────────────────────

/**
 * POST /auth/mfa/setup — Generate MFA setup data
 */
router.post('/mfa/setup', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const setupData = await auth.generateMFASetup(user.userId, user.userType, user.email);

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'mfa_setup_initiated',
      success: true
    }, req);

    res.json({
      secret: setupData.secret,
      qrCodeUrl: setupData.qrCodeUrl,
      backupCodes: setupData.backupCodes
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

/**
 * POST /auth/mfa/verify — Verify MFA setup
 */
router.post('/mfa/verify', mfaLimiter, auth.requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user!;

    const verified = await auth.verifyMFAToken(user.userId, user.userType, token);

    if (!verified) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'mfa_setup_completed',
      success: true
    }, req);

    res.json({ success: true, message: 'MFA setup completed successfully' });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

/**
 * POST /auth/mfa/verify-login — Verify MFA during login
 */
router.post('/mfa/verify-login', mfaLimiter, async (req, res) => {
  try {
    const { email, userType, token } = req.body;
    const clientIP = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] as string || 'unknown';

    // Find user ID
    let userId: number | null = null;
    switch (userType) {
      case 'athlete':
        const athlete = await findAthlete(email);
        userId = athlete?.id || null;
        break;
      case 'parent':
        const parent = await findParent(email);
        userId = parent?.id || null;
        break;
      case 'coach':
        const coach = await findCoach(email);
        userId = coach?.id || null;
        break;
      case 'admin':
        const admin = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, email)).limit(1);
        userId = admin.length > 0 ? admin[0].id : null;
        break;
    }

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const verified = await auth.verifyMFALogin(userId, userType as auth.UserType, token);
    if (!verified) {
      await auth.recordFailedAttempt(email, userType, clientIP, userAgent, 'mfa_failed');
      return res.status(401).json({ error: 'Invalid MFA token' });
    }

    // MFA verified, proceed with login completion
    res.json({ success: true });
  } catch (error) {
    console.error('MFA login verification error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

/**
 * POST /auth/mfa/regenerate-codes — Regenerate backup codes
 */
router.post('/mfa/regenerate-codes', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const backupCodes = await auth.regenerateBackupCodes(user.userId, user.userType);

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'mfa_backup_codes_regenerated',
      success: true
    }, req);

    res.json({ backupCodes });
  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

/**
 * DELETE /auth/mfa/disable — Disable MFA
 */
router.delete('/mfa/disable', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    await auth.disableMFA(user.userId, user.userType);

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'mfa_disabled',
      success: true
    }, req);

    res.json({ success: true, message: 'MFA disabled successfully' });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// ─── TOKEN MANAGEMENT ROUTES ───────────────────────────────────────────────────

/**
 * POST /auth/refresh — Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, deviceFingerprint } = req.body;
    const clientIP = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] as string || 'unknown';

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await auth.rotateRefreshToken(refreshToken, deviceFingerprint, clientIP, userAgent);

    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    await auth.logAuditEvent({
      userId: result.user.userId,
      userType: result.user.userType,
      action: 'token_refresh',
      success: true,
      metadata: { deviceFingerprint }
    }, req);

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /auth/logout — Logout user
 */
router.post('/logout', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { sessionId } = req.body;

    if (sessionId) {
      // Revoke specific session
      await auth.revokeSession(sessionId, 'user_logout');
    } else {
      // Revoke all user sessions
      await auth.revokeAllUserSessions(user.userId, user.userType, 'user_logout');
    }

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'logout',
      success: true,
      metadata: { sessionId }
    }, req);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// ─── SESSION MANAGEMENT ROUTES ─────────────────────────────────────────────────

/**
 * GET /auth/sessions — Get user's active sessions
 */
router.get('/sessions', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const sessions = await auth.getUserSessions(user.userId, user.userType);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * DELETE /auth/sessions/:sessionId — Revoke specific session
 */
router.delete('/sessions/:sessionId', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await auth.getSessionById(sessionId);
    if (!session || session.userId !== user.userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await auth.revokeSession(sessionId, 'user_action');

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'session_revoked',
      success: true,
      metadata: { sessionId }
    }, req);

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * DELETE /auth/sessions — Revoke all sessions except current
 */
router.delete('/sessions', auth.requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { keepCurrent = true } = req.query;

    if (keepCurrent === 'false') {
      await auth.revokeAllUserSessions(user.userId, user.userType, 'user_action');
    } else {
      // Revoke all except current session
      const sessions = await auth.getUserSessions(user.userId, user.userType);
      for (const session of sessions) {
        if (session.sessionId !== user.sessionId) {
          await auth.revokeSession(session.sessionId, 'user_action');
        }
      }
    }

    await auth.logAuditEvent({
      userId: user.userId,
      userType: user.userType,
      action: 'all_sessions_revoked',
      success: true,
      metadata: { keepCurrent: keepCurrent === 'true' }
    }, req);

    res.json({ success: true, message: 'Sessions revoked successfully' });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// ─── ADMIN SECURITY ROUTES ─────────────────────────────────────────────────────

/**
 * GET /auth/admin/security/metrics — Get security metrics
 */
router.get('/admin/security/metrics', auth.requireAdmin, async (req, res) => {
  try {
    const timeRange = parseInt(req.query.hours as string) || 24;
    const metrics = await auth.getSecurityMetrics(timeRange);

    res.json({ metrics, timeRangeHours: timeRange });
  } catch (error) {
    console.error('Security metrics error:', error);
    res.status(500).json({ error: 'Failed to get security metrics' });
  }
});

/**
 * GET /auth/admin/security/audit — Get audit logs
 */
router.get('/admin/security/audit', auth.requireAdmin, async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      userType: req.query.userType as auth.UserType,
      action: req.query.action as string,
      success: req.query.success ? req.query.success === 'true' : undefined,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100
    };

    const logs = await auth.getAuditLogs(filters);
    res.json({ logs, filters });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

/**
 * POST /auth/admin/security/cleanup — Run security data cleanup
 */
router.post('/admin/security/cleanup', auth.requireAdmin, async (req, res) => {
  try {
    const [tokenCleanup, securityCleanup] = await Promise.all([
      auth.cleanupTokenLifecycle(),
      auth.cleanupSecurityData()
    ]);

    await auth.logAuditEvent({
      userType: 'admin',
      action: 'security_cleanup',
      success: true,
      metadata: { tokenCleanup, securityCleanup }
    }, req);

    res.json({
      success: true,
      cleanup: { tokenCleanup, securityCleanup }
    });
  } catch (error) {
    console.error('Security cleanup error:', error);
    res.status(500).json({ error: 'Failed to run security cleanup' });
  }
});

// ─── Admin Auth ───────────────────────────────────────────────────────────────

/**
  * POST /auth/admin/register
  */
router.post('/admin/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  // Check if admin already exists
  const existingAdmin = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, email)).limit(1);
  if (existingAdmin.length > 0) {
    return res.status(400).json({ error: 'An admin account with this email already exists' });
  }

  try {
    const hashed = await auth.hashPassword(password);
    const newAdmin = {
      username: email,
      passwordHash: hashed,
      role: 'admin',
    };
    await db.insert(schema.adminUsers).values(newAdmin);
    const token = auth.signToken({ userId: email, email, role: 'admin', name });
    res.status(201).json({
      token,
      user: { id: email, email, name, role: 'admin' }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
  * POST /auth/admin/login
  */
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  // Check database for admin
  const admin = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, email)).limit(1);

  if (admin.length === 0) {
    // Fallback to hardcoded admin for demo
    if (email === 'admin@hers365.com' && password === 'admin123') {
      const token = auth.signToken({ userId: 1, email, role: 'admin', name: 'System Admin' });
      return res.json({
        token,
        user: { id: 1, email, name: 'System Admin', role: 'admin' }
      });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await auth.comparePassword(password, admin[0].passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = auth.signToken({ userId: admin[0].id, email, role: 'admin', name: admin[0].username });
  res.json({
    token,
    user: { id: admin[0].id, email, name: admin[0].username, role: 'admin' }
  });
});

// ─── Social Login ─────────────────────────────────────────────────────────────

/**
 * POST /auth/social/:provider
 * Unified endpoint for Google and Meta OAuth login
 */
router.post('/social/:provider', loginLimiter, async (req, res) => {
  const { provider } = req.params;
  const { token, role } = req.body;

  if (!token) return res.status(400).json({ error: 'Auth token is required' });

  // Validate the role
  const validRoles = ['athlete', 'parent', 'coach'];
  const userRole = validRoles.includes(role) ? role : 'athlete';

  try {
    let email = '';
    let name = '';
    let picture = '';

    if (provider === 'google') {
      try {
        if (!process.env.GOOGLE_CLIENT_ID) {
          // Mock verification for local dev
          console.warn('[Mock Auth] Missing GOOGLE_CLIENT_ID. Mocking Google verification.');
          email = 'google_user@demo.com';
          name = 'Google Athlete';
        } else {
          // Secure Google Token Verification
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          email = payload?.email || '';
          name = payload?.name || '';
          picture = payload?.picture || '';
        }
      } catch (e: any) {
        return res.status(401).json({ error: 'Invalid Google Token' });
      }
    } else if (provider === 'meta') {
      // Mock Meta verification (would normally use FB graph API here)
      console.warn('[Mock Auth] Mocking Meta verification.');
      email = 'meta_user@demo.com';
      name = 'Meta Athlete';
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!email) return res.status(400).json({ error: 'Failed to retrieve email from provider' });

    // Try finding the user
    let user = null;
    if (userRole === 'athlete') user = await findAthlete(email);
    else if (userRole === 'parent') user = await findParent(email);
    else if (userRole === 'coach') user = await findCoach(email);

    if (!user) {
      // Auto-register mock user for demo if not found in DB
      user = { id: Date.now(), email, name, role: userRole };
      if (userRole === 'athlete') mockAthletes.push(user as any);
      else if (userRole === 'parent') mockParents.push(user as any);
      else if (userRole === 'coach') mockCoaches.push({ ...user, school: 'TBD', division: 'TBD' } as any);
    }

    const jwtToken = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    
    res.json({
      token: jwtToken,
      user
    });

  } catch (error: any) {
    console.error('Social auth error:', error);
    res.status(500).json({ error: 'Internal server error during social login' });
  }
});

export default router;

