// tests/races.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql');
const raceController = require('../controllers/raceController');

const app = express();
app.use(express.json());
app.get('/api/races/:raceId/runners', raceController.getRaceDetailsWithRunners);

// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
const KNOWN_RACE_ID_WITH_RUNNERS = 1282657; // Example: Replace with an actual raceId from your DB
const NON_EXISTENT_RACE_ID = 999999999; // A raceId that definitely does not exist
// --- END Test Data Configuration ---

describe('Race Controller (Integration Tests)', () => {
    let pool;

    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for Race integration tests.');
        } catch (err) {
            console.error('Failed to connect to database for Race integration tests:', err);
            throw err;
        }
    }, 30000);

    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after Race integration tests.');
        } catch (err) {
            console.error('Failed to close database pool for Race:', err);
        }
    });

    jest.setTimeout(30000);

    describe('GET /api/races/:raceId/runners', () => {

        it('should return race details with nested runners for a known raceId', async () => {
            if (KNOWN_RACE_ID_WITH_RUNNERS === null || typeof KNOWN_RACE_ID_WITH_RUNNERS !== 'number') {
                console.warn("WARN: KNOWN_RACE_ID_WITH_RUNNERS not properly set or is not a number. This test might fail. Please update tests/races.test.js with a real numeric raceId.");
            }
            const res = await request(app)
                .get(`/api/races/${KNOWN_RACE_ID_WITH_RUNNERS}/runners`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('raceId', KNOWN_RACE_ID_WITH_RUNNERS);
            expect(res.body).toHaveProperty('raceNumber');
            expect(res.body).toHaveProperty('raceName');
            expect(res.body).toHaveProperty('raceDistance');
            expect(res.body).toHaveProperty('raceStartTimeUTC');
            expect(res.body).toHaveProperty('meetingId');
            expect(res.body).toHaveProperty('meetingName');
            expect(res.body).toHaveProperty('meetingDate');
            expect(res.body).toHaveProperty('trackCondition');
            expect(res.body).toHaveProperty('conditionsLastUpdate');

            expect(res.body).toHaveProperty('runners');
            expect(Array.isArray(res.body.runners)).toBe(true);
            expect(res.body.runners.length).toBeGreaterThan(0);

            const firstRunner = res.body.runners[0];
            expect(firstRunner).toHaveProperty('runnerId');
            expect(firstRunner).toHaveProperty('tabNo');
            expect(firstRunner).toHaveProperty('runnerName');
            expect(firstRunner).toHaveProperty('trainerName');
            expect(firstRunner).toHaveProperty('jockeyName');
            expect(firstRunner).toHaveProperty('jockeyWeight');
            expect(firstRunner).toHaveProperty('barrier');

            for (let i = 0; i < res.body.runners.length - 1; i++) {
                expect(res.body.runners[i].tabNo).toBeLessThanOrEqual(res.body.runners[i + 1].tabNo);
            }
        });

        // Test 2: Missing raceId in parameters
        it('should return 400 if raceId is missing', async () => {
            const res = await request(app)
                .get('/api/races/null/runners')
                .expect('Content-Type', /json/)
                .expect(400);

            // FIX: Updated expected error message
            expect(res.body).toHaveProperty('message', 'Race ID must be a valid number.');
        });

        // Test 3: Non-existent raceId
        it('should return 404 for a non-existent raceId', async () => {
            const res = await request(app)
                .get(`/api/races/${NON_EXISTENT_RACE_ID}/runners`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'Race not found');
        });

        // Test 4: Internal server error handling
        it('should handle internal server error', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                input: jest.fn().mockReturnThis(),
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/races/${KNOWN_RACE_ID_WITH_RUNNERS}/runners`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });
});