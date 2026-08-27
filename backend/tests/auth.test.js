const request = require('supertest');
const app = require('../src/app');

describe('Auth', () => {
  const user = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'correcthorsebattery' };

  test('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.token).toBeDefined();
  });

  test('rejects duplicate registration', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
  });

  test('rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, password: '123' });
    expect(res.status).toBe(400);
  });

  test('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects login with wrong password', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('/me requires a valid token', async () => {
    const noAuth = await request(app).get('/api/auth/me');
    expect(noAuth.status).toBe(401);

    const reg = await request(app).post('/api/auth/register').send(user);
    const withAuth = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(withAuth.status).toBe(200);
    expect(withAuth.body.user.email).toBe(user.email);
  });

  test('rejects malformed/garbage tokens', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage.token.here');
    expect(res.status).toBe(401);
  });
});
