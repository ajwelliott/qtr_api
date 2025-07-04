// tests/meetings.test.js
const request = require('supertest');
const express = require('express');
const routes = require('../routes/index');

const app = express();
app.use(express.json());
app.use('/api', routes);

describe('GET /api/meetings', () => {
  it('should return a list of meetings with races', async () => {
    const res = await request(app)
      .get('/api/meetings?page=1&pageSize=5')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const meeting = res.body[0];
    expect(meeting).toHaveProperty('meetingId');
    expect(meeting).toHaveProperty('meetingName');
    expect(meeting).toHaveProperty('meetingDate');
    expect(meeting).toHaveProperty('races');
    expect(Array.isArray(meeting.races)).toBe(true);
  }, 10000); // Extended timeout if needed
});
