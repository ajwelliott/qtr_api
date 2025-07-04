// tests/scratchings.test.js
const request = require('supertest');
const app = require('../app');

describe('Scratchings API', () => {
  it('should return scratchings for a specific date', async () => {
    const date = '2025-06-28'; // ✅ Replace with a known date that has data
    const res = await request(app)
      .get(`/api/scratchings?date=${date}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('meetingDate');
    }
  });

  it('should return scratchings for a specific meeting', async () => {
    const meetingId = '231528'; // ✅ Replace with a known meeting ID
    const res = await request(app)
      .get(`/api/meetings/${meetingId}/scratchings`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
