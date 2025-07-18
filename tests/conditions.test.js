// tests/conditions.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql'); // Import actual poolPromise
const routes = require('../routes/index'); // Assuming your main routes file is here

// Create a test Express app and mount the routes
const app = express();
app.use(express.json());
app.use('/api', routes); // Assuming your /api base path

// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
// These are IDs that *must* exist in your 'qtracing' database for tests to pass.
// You will need to ensure these records are present before running tests.
const KNOWN_MEETING_ID = 231584; // From your example JSON
const KNOWN_DATE = '2025-07-05'; // From your example JSON (YYYY-MM-DD)
const KNOWN_TRACK = 'Flemington';
const KNOWN_TRACK_CONDITION = 'Soft'; // From your example JSON

// Add a meeting with a known date and track for specific tests.
// Ensure there's also data for this meetingId and date.
const ANOTHER_KNOWN_MEETING_ID = 231583; // Ensure this exists in your DB with specific conditions
const ANOTHER_KNOWN_DATE = '2025-07-05';
const ANOTHER_KNOWN_TRACK = 'Rosehill';
const ANOTHER_KNOWN_TRACK_CONDITION = 'Heavy';


describe('Conditions Controller (Integration Tests)', () => {
    let pool;

    // Before all tests, ensure a database connection is established
    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for integration tests.');
            // Optional: Seed specific test data here if you don't manage it externally
            // For example, ensure records exist for KNOWN_MEETING_ID, KNOWN_DATE, etc.
            // This is crucial for reliable integration tests.
            // Example (pseudo-code):
            // await pool.request().query(`
            //   IF NOT EXISTS (SELECT 1 FROM pf_conditions WHERE meetingId = ${KNOWN_MEETING_ID})
            //   BEGIN
            //     INSERT INTO pf_conditions (meetingId, meetingDate, track, trackCondition, ...)
            //     VALUES (${KNOWN_MEETING_ID}, '${KNOWN_DATE}', '${KNOWN_TRACK}', '${KNOWN_TRACK_CONDITION}', ...);
            //   END
            // `);
        } catch (err) {
            console.error('Failed to connect to database for integration tests:', err);
            // Exit tests or mark them as skipped if DB connection fails
            throw err; // Jest will fail the test suite
        }
    }, 30000); // Increase timeout for DB connection

    // After all tests, close the database connection
    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after integration tests.');
        } catch (err) {
            console.error('Failed to close database pool:', err);
        }
    });

    // --- GET /api/conditions Tests ---
    describe('GET /api/conditions', () => {
        it('should return all conditions when no filters are applied', async () => {
            const res = await request(app)
                .get('/api/conditions')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0); // Should have some data
            expect(res.body[0]).toHaveProperty('meetingId');
            expect(res.body[0]).toHaveProperty('track');
            expect(res.body[0]).toHaveProperty('trackCondition');
        });

        it('should filter conditions by meetingId', async () => {
            const res = await request(app)
                .get(`/api/conditions?meetingId=${KNOWN_MEETING_ID}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(condition => {
                expect(condition).toHaveProperty('meetingId', KNOWN_MEETING_ID);
            });
        });

        it('should return 404 if meetingId has no conditions', async () => {
            const nonExistentMeetingId = 9999999; // Ensure this ID does not exist in your DB
            const res = await request(app)
                .get(`/api/conditions?meetingId=${nonExistentMeetingId}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'No conditions found matching your criteria.');
        });

        it('should filter conditions by date', async () => {
            const res = await request(app)
                .get(`/api/conditions?date=${KNOWN_DATE}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(condition => {
                // Note: meetingDate comes back as ISO string, so check its date part
                expect(condition.meetingDate).toContain(KNOWN_DATE);
            });
        });

        it('should return 404 if date has no conditions', async () => {
            const nonExistentDate = '2000-01-01'; // Ensure this date has no conditions in your DB
            const res = await request(app)
                .get(`/api/conditions?date=${nonExistentDate}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'No conditions found matching your criteria.');
        });

        it('should filter conditions by track (partial match)', async () => {
            const res = await request(app)
                .get(`/api/conditions?track=${KNOWN_TRACK.substring(0, 4)}`) // e.g., "Flem"
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(condition => {
                expect(condition.track).toContain(KNOWN_TRACK.substring(0, 4));
            });
        });

        it('should return 404 if track has no conditions', async () => {
            const nonExistentTrack = 'NonExistentTrack';
            const res = await request(app)
                .get(`/api/conditions?track=${nonExistentTrack}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'No conditions found matching your criteria.');
        });

        it('should filter conditions by trackCondition (partial match)', async () => {
            const res = await request(app)
                .get(`/api/conditions?trackCondition=${KNOWN_TRACK_CONDITION.substring(0, 3)}`) // e.g., "Sof"
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(condition => {
                expect(condition.trackCondition).toContain(KNOWN_TRACK_CONDITION.substring(0, 3));
            });
        });

        it('should return 404 if trackCondition has no conditions', async () => {
            const nonExistentTrackCondition = 'Volcano';
            const res = await request(app)
                .get(`/api/conditions?trackCondition=${nonExistentTrackCondition}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'No conditions found matching your criteria.');
        });

        it('should filter conditions by multiple criteria (meetingId, date, track)', async () => {
            // This test requires specific data combination to exist
            const res = await request(app)
                .get(`/api/conditions?meetingId=${KNOWN_MEETING_ID}&date=${KNOWN_DATE}&track=${KNOWN_TRACK}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1); // Expect at least one match
            res.body.forEach(condition => {
                expect(condition).toHaveProperty('meetingId', KNOWN_MEETING_ID);
                expect(condition.meetingDate).toContain(KNOWN_DATE);
                expect(condition.track).toBe(KNOWN_TRACK); // Full match for exactness
            });
        });

        it('should return 404 if multiple criteria yield no results', async () => {
            const res = await request(app)
                .get(`/api/conditions?meetingId=${KNOWN_MEETING_ID}&date=2000-01-01&track=${KNOWN_TRACK}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('message', 'No conditions found matching your criteria.');
        });

        it('should handle internal server error', async () => {
            // Corrected: Spy on pool.request() to return a mock object
            const spyOnPoolRequest = jest.spyOn(pool, 'request');

            // Create a mock request object that will throw an error when .query() is called
            const mockRequest = {
                input: jest.fn().mockReturnThis(), // Mock .input() to allow chaining
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error');
                })
            };

            // When `pool.request()` is called, return our `mockRequest`
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get('/api/conditions')
                .expect(500);

            expect(res.body).toHaveProperty('message', 'Internal Server Error');
            expect(res.body).toHaveProperty('error', 'Simulated DB error');

            // Restore the original implementation of pool.request after the test
            spyOnPoolRequest.mockRestore();
        });
    });
}, 60000); // Increased timeout for integration tests (60 seconds)