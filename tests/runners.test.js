// tests/runners.test.js
const request = require('supertest');
const app = require('../app');

describe('Runners API', () => {
  it('should return a runner profile', async () => {
    const runnerId = '991654'; // ⚠️ Replace with valid runner ID
    const res = await request(app)
      .get(`/api/runners/${runnerId}/profile`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('runnerId');
  });

  it('should return form history for a runner', async () => {
    const runnerId = '991654'; // ⚠️ Replace with valid runner ID
    const res = await request(app)
      .get(`/api/runners/${runnerId}/history`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return runners matching a name search', async () => {
    const res = await request(app)
      .get('/api/runners/search?name=king')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
