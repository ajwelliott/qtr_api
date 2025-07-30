// tests/betfairCommission.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise } = require('../db/sql');
const betfairCommissionController = require('../controllers/betfairCommissionController');

const app = express();
app.use(express.json());
app.get('/api/betfair-commission', betfairCommissionController.getAllCommissions);

describe('Betfair Commission Controller (Integration Tests)', () => {
  let pool;

  beforeAll(async () => {
    pool = await poolPromise;
    console.log('✅ DB connected for Betfair Commission tests.');
  }, 30000);

  afterAll(async () => {
    await pool.close();
    console.log('✅ DB pool closed after Betfair Commission tests.');
  });

  jest.setTimeout(30000);

  describe('GET /api/betfair-commission', () => {
    it('should return an array of state commission mappings', async () => {
      const res = await request(app)
        .get('/api/betfair-commission')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const entry = res.body[0];
        expect(entry).toHaveProperty('state');
        expect(entry).toHaveProperty('commission');
        expect(entry).toHaveProperty('state_name');
      }
    });

    it('should handle internal server errors gracefully', async () => {
      const spy = jest.spyOn(pool, 'request').mockImplementationOnce(() => {
        throw new Error('Simulated DB error');
      });

      const res = await request(app)
        .get('/api/betfair-commission')
        .expect(500);

      expect(res.text).toBe('Internal server error');
      spy.mockRestore();
    });
  });
});
