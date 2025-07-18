// tests/results.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql'); // Adjust path as necessary
const resultsController = require('../controllers/resultsController'); // Adjust path as necessary

// Create a test Express app and mount the routes
const app = express();
app.use(express.json());

// Manually apply the controller functions as routes for testing
app.get('/api/results', resultsController.getAllResults);
app.get('/api/results/race/:raceId', resultsController.getRaceResults);
app.get('/api/results/runner/:runnerId', resultsController.getRunnerResults);


// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
// You MUST ensure these values exist in your 'qtracing' database for tests to pass.
// Query your 'pf_results' table to find valid data.

// Find a meetingId that has results in pf_results
const KNOWN_MEETING_ID_WITH_RESULTS = 231584; // Example: Replace with an actual meetingId
// Find a raceId that has results in pf_results
const KNOWN_RACE_ID_WITH_RESULTS = 1282657; // Example: Replace with an actual raceId
// Find a runnerId that has results in pf_results
const KNOWN_RUNNER_ID_WITH_RESULTS = 975150; // Example: Replace with an actual runnerId

const NON_EXISTENT_ID = 999999999; // An ID that definitely does not exist
// --- END Test Data Configuration ---


describe('Results Controller (Integration Tests)', () => {
    let pool;

    // Connect to the database before all tests
    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for Results integration tests.');
        } catch (err) {
            console.error('Failed to connect to database for Results integration tests:', err);
            throw err;
        }
    }, 30000); // Increased timeout for DB connection

    // Close the database connection after all tests
    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after Results integration tests.');
        } catch (err) {
            console.error('Failed to close database pool for Results:', err);
        }
    });

    // Set a longer timeout for individual tests as they involve DB operations
    jest.setTimeout(30000); // 30 seconds per test

    describe('GET /api/results', () => {
        // Test 1: Get all results with no filters
        it('should return all results when no filters are applied', async () => {
            const res = await request(app)
                .get('/api/results')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0); // Expect some results
            expect(res.body[0]).toHaveProperty('raceId');
            expect(res.body[0]).toHaveProperty('runnerId');
            expect(res.body[0]).toHaveProperty('position');
            expect(res.body[0]).toHaveProperty('meetingId');
        });

        // Test 2: Filter by meetingId
        it('should return results filtered by meetingId', async () => {
            if (KNOWN_MEETING_ID_WITH_RESULTS === null) {
                console.warn("WARN: KNOWN_MEETING_ID_WITH_RESULTS not set. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/results?meetingId=${KNOWN_MEETING_ID_WITH_RESULTS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(result => {
                expect(result.meetingId).toBe(KNOWN_MEETING_ID_WITH_RESULTS);
            });
        });

        // Test 3: Filter by raceId
        it('should return results filtered by raceId', async () => {
            if (KNOWN_RACE_ID_WITH_RESULTS === null) {
                console.warn("WARN: KNOWN_RACE_ID_WITH_RESULTS not set. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/results?raceId=${KNOWN_RACE_ID_WITH_RESULTS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(result => {
                expect(result.raceId).toBe(KNOWN_RACE_ID_WITH_RESULTS);
            });
        });

        // Test 4: Filter by both meetingId and raceId
        it('should return results filtered by both meetingId and raceId', async () => {
            if (KNOWN_MEETING_ID_WITH_RESULTS === null || KNOWN_RACE_ID_WITH_RESULTS === null) {
                console.warn("WARN: KNOWN_MEETING_ID_WITH_RESULTS or KNOWN_RACE_ID_WITH_RESULTS not set. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/results?meetingId=${KNOWN_MEETING_ID_WITH_RESULTS}&raceId=${KNOWN_RACE_ID_WITH_RESULTS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(result => {
                expect(result.meetingId).toBe(KNOWN_MEETING_ID_WITH_RESULTS);
                expect(result.raceId).toBe(KNOWN_RACE_ID_WITH_RESULTS);
            });
        });

        // Test 5: Return empty array for no matching results
        it('should return an empty array if no results match criteria for getAllResults', async () => {
            const res = await request(app)
                .get(`/api/results?meetingId=${NON_EXISTENT_ID}&raceId=${NON_EXISTENT_ID}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 6: Internal server error handling for getAllResults
        it('should handle internal server error for getAllResults', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getAllResults');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get('/api/results')
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });

    describe('GET /api/results/race/:raceId', () => {
        // Test 1: Get results for a specific raceId
        it('should return results for a specific raceId', async () => {
            if (KNOWN_RACE_ID_WITH_RESULTS === null) {
                console.warn("WARN: KNOWN_RACE_ID_WITH_RESULTS not set. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/results/race/${KNOWN_RACE_ID_WITH_RESULTS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(result => {
                expect(result.raceId).toBe(KNOWN_RACE_ID_WITH_RESULTS);
            });
            // Verify sorting by position ASC
            for (let i = 0; i < res.body.length - 1; i++) {
                expect(res.body[i].position).toBeLessThanOrEqual(res.body[i + 1].position);
            }
        });

        // Test 2: Return empty array for non-existent raceId
        it('should return an empty array for a non-existent raceId for getRaceResults', async () => {
            const res = await request(app)
                .get(`/api/results/race/${NON_EXISTENT_ID}`)
                .expect('Content-Type', /json/)
                .expect(200); // Expect 200 with empty array, as per controller logic

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 3: Internal server error handling for getRaceResults
        it('should handle internal server error for getRaceResults', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getRaceResults');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/results/race/${KNOWN_RACE_ID_WITH_RESULTS}`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });

    describe('GET /api/results/runner/:runnerId', () => {
        // Test 1: Get results for a specific runnerId
        it('should return results for a specific runnerId', async () => {
            if (KNOWN_RUNNER_ID_WITH_RESULTS === null) {
                console.warn("WARN: KNOWN_RUNNER_ID_WITH_RESULTS not set. This test might fail.");
            }
            const res = await request(app)
                .get(`/api/results/runner/${KNOWN_RUNNER_ID_WITH_RESULTS}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(result => {
                expect(result.runnerId).toBe(KNOWN_RUNNER_ID_WITH_RESULTS);
            });
            // Verify sorting by meetingId DESC
            for (let i = 0; i < res.body.length - 1; i++) {
                expect(res.body[i].meetingId).toBeGreaterThanOrEqual(res.body[i + 1].meetingId);
            }
        });

        // Test 2: Return empty array for non-existent runnerId
        it('should return an empty array for a non-existent runnerId for getRunnerResults', async () => {
            const res = await request(app)
                .get(`/api/results/runner/${NON_EXISTENT_ID}`)
                .expect('Content-Type', /json/)
                .expect(200); // Expect 200 with empty array, as per controller logic

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 3: Internal server error handling for getRunnerResults
        it('should handle internal server error for getRunnerResults', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getRunnerResults');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/results/runner/${KNOWN_RUNNER_ID_WITH_RESULTS}`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });
});