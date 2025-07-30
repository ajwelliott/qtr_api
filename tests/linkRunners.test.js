// tests/linkRunners.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise } = require('../db/sql');
const linkRunnersController = require('../controllers/linkRunnersController');

const app = express();
app.use(express.json());
app.get('/api/link-runners', linkRunnersController.getAllLinkRunners);

describe('Link Runners Controller (Integration Tests)', () => {
  let pool;

  beforeAll(async () => {
    pool = await poolPromise;
    console.log('✅ DB connected for Link Runners tests.');
  }, 30000);

  afterAll(async () => {
    await pool.close();
    console.log('✅ DB pool closed after Link Runners tests.');
  });

  jest.setTimeout(30000);

  describe('GET /api/link-runners', () => {
    it('should return an array of link runner records', async () => {
      const res = await request(app)
        .get('/api/link-runners')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const row = res.body[0];
        expect(row).toHaveProperty('LinkKey');
        expect(row).toHaveProperty('meetingDate');
        expect(row).toHaveProperty('MasterTrackName');
        expect(row).toHaveProperty('raceNumber');
        expect(row).toHaveProperty('tabNo');
        expect(row).toHaveProperty('raceId');
        expect(row).toHaveProperty('runnerId');
        expect(row).toHaveProperty('raceId_runnerId');
      }
    });

    it('should handle DB errors gracefully', async () => {
      const pool = await poolPromise;
      const spy = jest.spyOn(pool, 'request').mockImplementationOnce(() => {
        throw new Error('Simulated DB error');
      });

      const res = await request(app)
        .get('/api/link-runners')
        .expect(500);

      expect(res.text).toBe('Internal server error');
      spy.mockRestore();
    });
  });
});
