// tests/scratchings.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql'); // Adjust path as necessary
const scratchingController = require('../controllers/scratchingController'); // Adjust path as necessary

// Create a test Express app and mount the routes
const app = express();
app.use(express.json());

// Manually apply the controller functions as routes for testing
app.get('/api/scratchings', scratchingController.getAllScratchings);
app.get('/api/scratchings/meeting/:meetingId', scratchingController.getMeetingScratchings);
app.get('/api/scratchings/race/:raceId', scratchingController.getRaceScratchings);


// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
// You MUST ensure these values exist in your 'qtracing' database for tests to pass.
// Query your 'pf_scratchings' and 'pf_field_list' tables to find valid data.

// Find a meetingId that has scratchings in pf_scratchings
const KNOWN_MEETING_ID_WITH_SCRATCHINGS = 231584; // Example: Rosehill 2025-07-05 (check your DB)
// Find a raceId that has scratchings in pf_scratchings
const KNOWN_RACE_ID_WITH_SCRATCHINGS = 1282657; // Example: A race from the above meeting (check your DB)
// Find a runnerId that is scratched in pf_scratchings for the above race/meeting
const KNOWN_SCRATCHED_RUNNER_ID = 1104778; // Example: A runner from the above race (check your DB)

const NON_EXISTENT_ID = 999999999; // An ID that definitely does not exist
// --- END Test Data Configuration ---


describe('Scratching Controller (Integration Tests)', () => {
    let pool;

    // Connect to the database before all tests
    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for Scratching integration tests.');
        } catch (err) {
            console.error('Failed to connect to database for Scratching integration tests:', err);
            throw err;
        }
    }, 30000); // Increased timeout for DB connection

    // Close the database connection after all tests
    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after Scratching integration tests.');
        } catch (err) {
            console.error('Failed to close database pool for Scratching:', err);
        }
    });

    // Set a longer timeout for individual tests as they involve DB operations
    jest.setTimeout(30000); // 30 seconds per test

    describe('GET /api/scratchings', () => {
        // Test 1: Get all scratchings
        it('should return all scratchings with runner names', async () => {
            const res = await request(app)
                .get('/api/scratchings')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(0); // Can be 0 if no scratchings exist

            if (res.body.length > 0) {
                const scratching = res.body[0];
                expect(scratching).toHaveProperty('meetingId');
                expect(typeof scratching.meetingId).toBe('number');
                expect(scratching).toHaveProperty('raceId');
                expect(typeof scratching.raceId).toBe('number');
                expect(scratching).toHaveProperty('runnerId');
                expect(typeof scratching.runnerId).toBe('number');
                expect(scratching).toHaveProperty('meetingDate');
                expect(scratching).toHaveProperty('track');
                expect(scratching).toHaveProperty('raceNumber'); // Renamed
                expect(typeof scratching.raceNumber).toBe('number');
                expect(scratching).toHaveProperty('runnerNumber'); // Renamed
                expect(typeof scratching.runnerNumber).toBe('number');
                expect(scratching).toHaveProperty('deduction');
                expect(scratching).toHaveProperty('runnerName'); // Attached by utility
                // Check if runnerName is not null for a few entries if possible
                // if (scratching.runnerName) { expect(typeof scratching.runnerName).toBe('string'); }
            }
        });

        // Test 2: Internal server error handling for getAllScratchings
        it('should handle internal server error for getAllScratchings', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getAllScratchings');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get('/api/scratchings')
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });

    describe('GET /api/scratchings/meeting/:meetingId', () => {
        // Test 1: Get scratchings for a specific meetingId
        it('should return scratchings for a specific meetingId with runner names', async () => {
            if (KNOWN_MEETING_ID_WITH_SCRATCHINGS === null || typeof KNOWN_MEETING_ID_WITH_SCRATCHINGS !== 'number') {
                console.warn("WARN: KNOWN_MEETING_ID_WITH_SCRATCHINGS not set or is not a number. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/scratchings/meeting/${KNOWN_MEETING_ID_WITH_SCRATCHINGS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(0); // Can be 0 if meeting exists but no scratchings

            res.body.forEach(scratching => {
                expect(scratching).toHaveProperty('meetingId', KNOWN_MEETING_ID_WITH_SCRATCHINGS);
                expect(typeof scratching.meetingId).toBe('number');
                expect(scratching).toHaveProperty('runnerName');
                expect(typeof scratching.runnerName).toBe('string');
            });
        });

        // Test 2: Return empty array for non-existent meetingId
        it('should return an empty array for a non-existent meetingId', async () => {
            const res = await request(app)
                .get(`/api/scratchings/meeting/${NON_EXISTENT_ID}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 3: Return 400 for an invalid meetingId (non-numeric)
        it('should return 400 for an invalid (non-numeric) meetingId', async () => {
            const res = await request(app)
                .get('/api/scratchings/meeting/invalidID')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('message', 'Meeting ID must be a valid number.');
        });

        // Test 4: Internal server error handling for getMeetingScratchings
        it('should handle internal server error for getMeetingScratchings', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                input: jest.fn().mockReturnThis(), // input is called before query
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getMeetingScratchings');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/scratchings/meeting/${KNOWN_MEETING_ID_WITH_SCRATCHINGS}`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });

    describe('GET /api/scratchings/race/:raceId', () => {
        // Test 1: Get scratchings for a specific raceId
        it('should return scratchings for a specific raceId with runner names', async () => {
            if (KNOWN_RACE_ID_WITH_SCRATCHINGS === null || typeof KNOWN_RACE_ID_WITH_SCRATCHINGS !== 'number') {
                console.warn("WARN: KNOWN_RACE_ID_WITH_SCRATCHINGS not set or is not a number. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/scratchings/race/${KNOWN_RACE_ID_WITH_SCRATCHINGS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(0); // Can be 0 if race exists but no scratchings

            res.body.forEach(scratching => {
                expect(scratching).toHaveProperty('raceId', KNOWN_RACE_ID_WITH_SCRATCHINGS);
                expect(typeof scratching.raceId).toBe('number');
                expect(scratching).toHaveProperty('runnerName');
                expect(typeof scratching.runnerName).toBe('string');
            });
        });

        // Test 2: Return empty array for non-existent raceId
        it('should return an empty array for a non-existent raceId', async () => {
            const res = await request(app)
                .get(`/api/scratchings/race/${NON_EXISTENT_ID}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 3: Return 400 for an invalid raceId (non-numeric)
        it('should return 400 for an invalid (non-numeric) raceId', async () => {
            const res = await request(app)
                .get('/api/scratchings/race/invalidID')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('message', 'Race ID must be a valid number.');
        });

        // Test 4: Internal server error handling for getRaceScratchings
        it('should handle internal server error for getRaceScratchings', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                input: jest.fn().mockReturnThis(), // input is called before query
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getRaceScratchings');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/scratchings/race/${KNOWN_RACE_ID_WITH_SCRATCHINGS}`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });
});
