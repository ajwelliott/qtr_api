// tests/results.test.js
const request = require('supertest');
const app = require('../app');

describe('Results API', () => {
  it('should return all results', async () => {
    const res = await request(app)
      .get('/api/results')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return results for a specific race', async () => {
    const raceId = '120847'; // ⚠️ Replace with valid race ID
    const res = await request(app)
      .get(`/api/results/race/${raceId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return results for a specific runner', async () => {
    const runnerId = '991654'; // ⚠️ Replace with valid runner ID
    const res = await request(app)
      .get(`/api/results/runner/${runnerId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
