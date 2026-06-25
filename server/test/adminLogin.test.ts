import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAdmin } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('admin login', () => {
  it('an admin_users row logs in via /api/auth/login and gets role=admin', async () => {
    await makeAdmin('admin@hers365.com');

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@hers365.com',
      password: 'Test-pw-123',
    });

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('admin');
    expect(JSON.stringify(login.body)).not.toContain('password_hash');
  });

  it('the admin token is accepted by requireAdmin routes', async () => {
    await makeAdmin('admin@hers365.com');
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@hers365.com',
      password: 'Test-pw-123',
    });
    const token = login.body.token;

    const res = await request(app)
      .get('/api/admin/data/stats')
      .set('Authorization', `Bearer ${token}`);

    // The fix is about auth, not the handler: just prove requireAdmin let it through.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('a wrong password for an admin still 401s', async () => {
    await makeAdmin('admin@hers365.com');
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@hers365.com',
      password: 'wrong-password',
    });
    expect(login.status).toBe(401);
  });
});
