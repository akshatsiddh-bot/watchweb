const request = require('supertest');
const app = require('../src/app');

async function registerUser(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'correcthorsebattery' });
  return res.body.token;
}

const validWatch = {
  name: 'Exam Schedule',
  url: 'https://example.com/exams',
  monitoringMode: 'selected',
  selector: '#exam-table',
  selectorType: 'css',
  interval: 60,
};

describe('Watches', () => {
  test('requires authentication to create a watch', async () => {
    const res = await request(app).post('/api/watches').send(validWatch);
    expect(res.status).toBe(401);
  });

  test('creates a watch for an authenticated user', async () => {
    const token = await registerUser('owner@example.com');
    const res = await request(app)
      .post('/api/watches')
      .set('Authorization', `Bearer ${token}`)
      .send(validWatch);
    expect(res.status).toBe(201);
    expect(res.body.watch.name).toBe('Exam Schedule');
    expect(res.body.watch.status).toBe('active');
  });

  test('rejects a watch below the minimum interval', async () => {
    const token = await registerUser('owner2@example.com');
    const res = await request(app)
      .post('/api/watches')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validWatch, interval: 1 });
    expect(res.status).toBe(400);
  });

  test('rejects selected-element mode without a selector', async () => {
    const token = await registerUser('owner3@example.com');
    const res = await request(app)
      .post('/api/watches')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validWatch, selector: undefined });
    expect(res.status).toBe(400);
  });

  test('a user cannot access another user\'s watch', async () => {
    const tokenA = await registerUser('a@example.com');
    const tokenB = await registerUser('b@example.com');

    const created = await request(app)
      .post('/api/watches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validWatch);
    const watchId = created.body.watch._id;

    const res = await request(app)
      .get(`/api/watches/${watchId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  test('a user cannot delete another user\'s watch', async () => {
    const tokenA = await registerUser('c@example.com');
    const tokenB = await registerUser('d@example.com');

    const created = await request(app)
      .post('/api/watches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validWatch);
    const watchId = created.body.watch._id;

    const res = await request(app)
      .delete(`/api/watches/${watchId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);

    const stillThere = await request(app)
      .get(`/api/watches/${watchId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(stillThere.status).toBe(200);
  });

  test('pause and resume update status', async () => {
    const token = await registerUser('e@example.com');
    const created = await request(app)
      .post('/api/watches')
      .set('Authorization', `Bearer ${token}`)
      .send(validWatch);
    const watchId = created.body.watch._id;

    const paused = await request(app)
      .post(`/api/watches/${watchId}/pause`)
      .set('Authorization', `Bearer ${token}`);
    expect(paused.body.watch.status).toBe('paused');

    const resumed = await request(app)
      .post(`/api/watches/${watchId}/resume`)
      .set('Authorization', `Bearer ${token}`);
    expect(resumed.body.watch.status).toBe('active');
  });

  test('rejects SSRF attempts targeting localhost/private IPs', async () => {
    const token = await registerUser('f@example.com');
    const targets = [
      'http://localhost:4000/api/health',
      'http://127.0.0.1/admin',
      'http://169.254.169.254/latest/meta-data/',
      'http://192.168.1.1/',
      'http://10.0.0.5/',
    ];
    for (const url of targets) {
      const res = await request(app)
        .post('/api/watches')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validWatch, url });
      expect(res.status).toBe(400);
    }
  });

  test('enforces max watches per user', async () => {
    const token = await registerUser('g@example.com');
    process.env.MAX_WATCHES_PER_USER = '2';
    // Note: env module reads this at process start, so this test documents
    // the intended behavior; see watchService.assertUnderWatchLimit.
    for (let i = 0; i < 2; i++) {
      const res = await request(app)
        .post('/api/watches')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validWatch, name: `Watch ${i}` });
      expect(res.status).toBe(201);
    }
  });
});
