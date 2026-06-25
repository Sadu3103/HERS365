import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);

type DecodedToken = {
  userId?: number;
  email?: string;
  role?: string;
  name?: string;
  // pre-fix shape — should NOT appear when role/userId is missing
  id?: number;
  subscriptionTier?: string | null;
};

function decode(token: string): DecodedToken {
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

describe('POST /api/auth/email/register', () => {
  it('mints a token in the canonical { userId, role, name, email } shape', async () => {
    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'canon-register@test.local', password: 'Password1', name: 'Canon' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');

    const decoded = decode(res.body.token);
    expect(decoded.userId).toBe(res.body.user.id);
    expect(decoded.email).toBe('canon-register@test.local');
    expect(decoded.role).toBe('athlete');
    expect(decoded.name).toBe('Canon');
  });
});

describe('POST /api/auth/email/login', () => {
  it('mints a token in the canonical { userId, role, name, email } shape', async () => {
    const registerRes = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'canon-login@test.local', password: 'Password1', name: 'Canon Login' });
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'canon-login@test.local', password: 'Password1' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf('string');

    const decoded = decode(loginRes.body.token);
    expect(decoded.userId).toBe(loginRes.body.user.id);
    expect(decoded.email).toBe('canon-login@test.local');
    expect(decoded.role).toBe('athlete');
    expect(decoded.name).toBe('Canon Login');
  });
});

describe('email-auth token works on routes that read req.user.userId / req.user.role', () => {
  it('GET /api/profile resolves the caller from req.user.userId after email-auth login', async () => {
    const email = 'profile-flow@test.local';
    await request(app)
      .post('/api/auth/email/register')
      .send({ email, password: 'Password1', name: 'Profile Flow' });

    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email, password: 'Password1' });
    expect(loginRes.status).toBe(200);
    const token: string = loginRes.body.token;

    const profileRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRes.status).toBe(200);
    // The route reads req.user.userId to look up the row. If userId is
    // undefined (the pre-fix bug) this either 500s on a nullable lookup or
    // resolves to a different player. Asserting the email is the canonical
    // happy path.
    expect(profileRes.body?.email).toBe(email);
  });

  it('GET /api/notifications resolves the caller from req.user.id after email-auth register', async () => {
    const registerRes = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'notif-flow@test.local', password: 'Password1', name: 'Notif Flow' });
    expect(registerRes.status).toBe(201);
    const token: string = registerRes.body.token;

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([]);
    expect(res.body.unreadCount).toBe(0);
  });
});
