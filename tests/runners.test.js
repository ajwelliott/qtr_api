// tests/runners.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql'); // Adjust path as necessary
const runnerController = require('../controllers/runnerController'); // Adjust path as necessary

// Create a test Express app and mount the routes
const app = express();
app.use(express.json());

// Manually apply the controller functions as routes for testing
app.get('/api/runners/:runnerId/profile', runnerController.getRunnerProfile);
app.get('/api/runners/search', runnerController.searchRunnersByName);


// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
// You MUST ensure these values exist in your 'qtracing' database for tests to pass.
// Query your 'pf_field_list', 'pf_worksheets', 'pf_ratings', 'pf_form', and 'pf_scratchings' tables to find valid data.

// Find a runnerId that exists and has associated data across the tables
const KNOWN_RUNNER_ID = 975150; // Example: Replace with an actual runnerId from your DB
const NON_EXISTENT_RUNNER_ID = 999999999; // A runnerId that definitely does not exist

// Find a partial name that exists in pf_field_list for search
const KNOWN_RUNNER_NAME_PARTIAL = 'Elouy'; // Example: Replace with a partial name like 'gold' or 'star'
const NON_EXISTENT_RUNNER_NAME = 'XYZNoSuchRunnerXYZ'; // A name that definitely does not exist
// --- END Test Data Configuration ---


describe('Runner Controller (Integration Tests)', () => {
    let pool;

    // Connect to the database before all tests
    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for Runner integration tests.');
        } catch (err) {
            console.error('Failed to connect to database for Runner integration tests:', err);
            throw err;
        }
    }, 30000); // Increased timeout for DB connection

    // Close the database connection after all tests
    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after Runner integration tests.');
        } catch (err) {
            console.error('Failed to close database pool for Runner:', err);
        }
    });

    // Set a longer timeout for individual tests as they involve DB operations
    jest.setTimeout(30000); // 30 seconds per test

    describe('GET /api/runners/:runnerId/profile', () => {

        // Test 1: Successful retrieval of a runner's full profile
        it('should return a full runner profile for a known runnerId', async () => {
            if (KNOWN_RUNNER_ID === null || typeof KNOWN_RUNNER_ID !== 'number') {
                console.warn("WARN: KNOWN_RUNNER_ID not properly set or is not a number. This test might fail. Please update tests/runners.test.js with a real numeric runnerId.");
            }
            const res = await request(app)
                .get(`/api/runners/${KNOWN_RUNNER_ID}/profile`)
                .expect('Content-Type', /json/)
                .expect(200);

            // Check top-level properties
            expect(res.body).toHaveProperty('runnerId', KNOWN_RUNNER_ID);
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('sex');
            expect(res.body).toHaveProperty('age');
            expect(res.body).toHaveProperty('country');
            expect(res.body).toHaveProperty('foalDate');
            expect(res.body).toHaveProperty('colours');
            expect(res.body).toHaveProperty('barrier');
            expect(typeof res.body.barrier).toBe('number'); // Ensure parsed as number
            expect(res.body).toHaveProperty('tabNo');
            expect(typeof res.body.tabNo).toBe('number'); // Ensure parsed as number
            expect(res.body).toHaveProperty('handicapRating');
            expect(res.body).toHaveProperty('last10');

            // Check nested trainer object
            expect(res.body).toHaveProperty('trainer');
            expect(res.body.trainer).toHaveProperty('id');
            expect(typeof res.body.trainer.id).toBe('number'); // Ensure parsed as number
            expect(res.body.trainer).toHaveProperty('name');
            expect(res.body.trainer).toHaveProperty('location');

            // Check nested jockey object
            expect(res.body).toHaveProperty('jockey');
            expect(res.body.jockey).toHaveProperty('id');
            expect(typeof res.body.jockey.id).toBe('number'); // Ensure parsed as number
            expect(res.body.jockey).toHaveProperty('name');
            expect(res.body.jockey).toHaveProperty('weight');
            expect(res.body.jockey).toHaveProperty('claim');
            expect(res.body.jockey).toHaveProperty('isApprentice');

            // Check for optional/array properties
            expect(res.body).toHaveProperty('worksheet'); // Can be object or null
            expect(res.body).toHaveProperty('ratings'); // Can be object or null
            expect(res.body).toHaveProperty('scratchings');
            expect(Array.isArray(res.body.scratchings)).toBe(true);
            expect(res.body).toHaveProperty('recentForm');
            expect(Array.isArray(res.body.recentForm)).toBe(true);

            // If scratchings exist, check a property
            if (res.body.scratchings.length > 0) {
                expect(typeof res.body.scratchings[0].runnerId).toBe('number');
            }
            // If recentForm exists, check a property
            if (res.body.recentForm.length > 0) {
                expect(typeof res.body.recentForm[0].runnerId).toBe('number');
            }
        });

        // Test 2: Return 404 for a non-existent runnerId
        it('should return 404 for a non-existent runnerId', async () => {
            const res = await request(app)
                .get(`/api/runners/${NON_EXISTENT_RUNNER_ID}/profile`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'Runner not found');
        });

        // Test 3: Return 400 for an invalid runnerId (non-numeric)
        it('should return 400 for an invalid (non-numeric) runnerId', async () => {
            const res = await request(app)
                .get('/api/runners/invalidID/profile')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('message', 'Runner ID must be a valid number.');
        });

        // Test 4: Internal server error handling for getRunnerProfile
        it('should handle internal server error for getRunnerProfile', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            // Mock the first query (pf_field_list) to throw an error
            const mockRequest = {
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for getRunnerProfile');
                }),
                input: jest.fn().mockReturnThis() // input is called before query
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/runners/${KNOWN_RUNNER_ID}/profile`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore(); // Restore original implementation
        });
    });

    describe('GET /api/runners/search', () => {

        // Test 1: Successful search with results
        it('should return runners matching the search name (partial)', async () => {
            if (KNOWN_RUNNER_NAME_PARTIAL === 'test') {
                console.warn("WARN: KNOWN_RUNNER_NAME_PARTIAL not set. This test might fail. Please update tests/runners.test.js with a real partial runner name.");
            }
            const res = await request(app)
                .get(`/api/runners/search?name=${KNOWN_RUNNER_NAME_PARTIAL}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0); // Expect at least one result
            res.body.forEach(runner => {
                expect(runner).toHaveProperty('runnerId');
                expect(typeof runner.runnerId).toBe('number'); // Ensure parsed as number
                expect(runner).toHaveProperty('name');
                expect(runner.name.toLowerCase()).toContain(KNOWN_RUNNER_NAME_PARTIAL.toLowerCase());
                expect(runner).toHaveProperty('trainerName');
                expect(runner).toHaveProperty('jockeyName');
                expect(runner).toHaveProperty('meetingId');
                expect(typeof runner.meetingId).toBe('number'); // Ensure parsed as number
                expect(runner).toHaveProperty('raceId');
                expect(typeof runner.raceId).toBe('number'); // Ensure parsed as number
            });
            // Verify sorting by name ASC
            for (let i = 0; i < res.body.length - 1; i++) {
                expect(res.body[i].name.localeCompare(res.body[i + 1].name)).toBeLessThanOrEqual(0);
            }
        });

        // Test 2: Search with no matching results
        it('should return an empty array if no runners match the search name', async () => {
            const res = await request(app)
                .get(`/api/runners/search?name=${NON_EXISTENT_RUNNER_NAME}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 3: Return 400 if search name is missing or too short
        it('should return 400 if search name is missing or too short', async () => {
            // Test missing name
            let res = await request(app)
                .get('/api/runners/search')
                .expect('Content-Type', /json/)
                .expect(400);
            expect(res.body).toHaveProperty('message', 'Provide at least 2 characters for runner name.');

            // Test name too short
            res = await request(app)
                .get('/api/runners/search?name=a')
                .expect('Content-Type', /json/)
                .expect(400);
            expect(res.body).toHaveProperty('message', 'Provide at least 2 characters for runner name.');
        });

        // Test 4: Internal server error handling for searchRunnersByName
        it('should handle internal server error for searchRunnersByName', async () => {
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error for searchRunnersByName');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get(`/api/runners/search?name=${KNOWN_RUNNER_NAME_PARTIAL}`)
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore();
        });
    });
});
