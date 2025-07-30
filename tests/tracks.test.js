// tests/tracks.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise } = require('../db/sql');
const tracksController = require('../controllers/tracksController');

const app = express();
app.use(express.json());
app.get('/api/tracks', tracksController.getAllTracks);

describe('Tracks Controller (Integration Tests)', () => {
  let pool;

  beforeAll(async () => {
    pool = await poolPromise;
    console.log('✅ DB connected for Tracks tests.');
  }, 30000);

  afterAll(async () => {
    await pool.close();
    console.log('✅ DB pool closed after Tracks tests.');
  });

  jest.setTimeout(30000);

  describe('GET /api/tracks', () => {
    it('should return an array of track mappings', async () => {
      const res = await request(app)
        .get('/api/tracks')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const track = res.body[0];
        expect(track).toHaveProperty('MasterTrackName');
        expect(track).toHaveProperty('VariationTrackName');
      }
    });

    it('should handle internal server errors gracefully', async () => {
      const spy = jest.spyOn(pool, 'request').mockImplementationOnce(() => {
        throw new Error('Simulated DB error');
      });

      const res = await request(app)
        .get('/api/tracks')
        .expect(500);

      expect(res.text).toBe('Internal server error');
      spy.mockRestore();
    });
  });
});
