import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('createApp', () => {
  it('serves /health without listening on a port', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
