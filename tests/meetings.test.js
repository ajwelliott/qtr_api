// tests/meetings.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql'); // Adjust path as necessary
const meetingController = require('../controllers/meetingController'); // Adjust path as necessary
const fs = require('fs'); // Added for debugging - will write res.body to file

// Create a test Express app and mount the routes
const app = express();
app.use(express.json());

// Manually apply the controller function as a route for testing
app.get('/api/meetings', meetingController.getMeetingsWithRaces);


// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
// You MUST ensure these values exist in your 'qtracing' database for tests to pass.
// Query your 'pf_meeting_list', 'pf_races', and 'pf_conditions' tables to find valid data.

// For date filters
// Pick a date that has meetings and races associated with it
const KNOWN_DATE = '2025-07-05'; // e.g., '2025-07-05'
const KNOWN_DATE_FROM = '2025-06-28'; // e.g., '2025-07-01'
const KNOWN_DATE_TO = '2025-07-05'; // e.g., '2025-07-31'
const DATE_WITH_NO_MEETINGS = '2000-01-01'; // Ensure this date has no data

// For track filter
// Pick a partial track name that exists in your pf_meeting_list table
const KNOWN_TRACK_NAME_PARTIAL = 'Flem'; // e.g., 'Flem' for 'Flemington'
const KNOWN_FULL_TRACK_NAME = 'Flemington'; // e.g., 'Flemington'
const NON_EXISTENT_TRACK = 'NonExistentTrackXYZ';

// Define a meetingId that you know exists and has associated races
const KNOWN_MEETING_ID_WITH_RACES = 231584; // Example, replace with actual ID
// --- END Test Data Configuration ---


describe('Meeting Controller (Integration Tests)', () => {
    let pool;

    // Connect to the database before all tests
    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for Meeting integration tests.');
        } catch (err) {
            console.error('Failed to connect to database for Meeting integration tests:', err);
            // If connection fails, throw error to stop tests
            throw err;
        }
    }, 30000); // Increased timeout for DB connection

    // Close the database connection after all tests
    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after Meeting integration tests.');
        } catch (err) {
            console.error('Failed to close database pool for Meeting:', err);
        }
    });

    // Set a longer timeout for individual tests as they involve DB operations
    jest.setTimeout(30000); // 30 seconds per test

    describe('GET /api/meetings', () => {

        // Test 1: No filters, default pagination
        it('should return paginated meetings with races when no filters are applied', async () => {
            const res = await request(app)
                .get('/api/meetings')
                .expect('Content-Type', /json/)
                .expect(200);

            // Write the full response body to a file for debugging
            fs.writeFileSync(
                'received_meetings_data.json',
                JSON.stringify(res.body, null, 2)
            );
            console.log('Full response body saved to received_meetings_data.json');


            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body.length).toBeLessThanOrEqual(50); // Default pageSize

            const meeting = res.body[0];
            expect(meeting).toHaveProperty('meetingId');
            expect(meeting).toHaveProperty('meetingName');
            expect(meeting).toHaveProperty('meetingDate');
            expect(meeting).toHaveProperty('trackCondition'); // From pf_conditions
            expect(meeting).toHaveProperty('races');
            expect(Array.isArray(meeting.races)).toBe(true);
            // If there are races for this meeting, check race properties
            if (meeting.races.length > 0) {
                const race = meeting.races[0];
                expect(race).toHaveProperty('raceId');
                expect(race).toHaveProperty('raceNumber');
                expect(race).toHaveProperty('raceName');
            }
            // Verify sorting by meetingDate DESC
            for (let i = 0; i < res.body.length - 1; i++) {
                const date1 = new Date(res.body[i].meetingDate);
                const date2 = new Date(res.body[i + 1].meetingDate);
                expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
            }
        });

        // Test 2: Pagination with custom page and pageSize
        it('should return meetings based on specified page and pageSize', async () => {
            const pageSize = 10;
            const page = 2; // Assuming enough data for a second page
            const res = await request(app)
                .get(`/api/meetings?page=${page}&pageSize=${pageSize}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            // Check that the returned length is consistent with pageSize, or less if it's the last page
            expect(res.body.length).toBeLessThanOrEqual(pageSize);
            // This test is harder to assert exact content without mocking the DB perfectly,
            // but we ensure it returns a valid structure.
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('meetingId');
            }
        });

        // Test 3: Filter by specific date
        it('should filter meetings by a specific date', async () => {
            if (KNOWN_DATE === 'YYYY-MM-DD') {
                console.warn("WARN: KNOWN_DATE not set. This test might fail. Please update tests/meetings.test.js with a real date.");
            }
            const res = await request(app)
                .get(`/api/meetings?date=${KNOWN_DATE}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0); // Expect results for a known date
            res.body.forEach(meeting => {
                // Ensure date matches (compare date parts only)
                const meetingDate = new Date(meeting.meetingDate).toISOString().split('T')[0];
                expect(meetingDate).toBe(KNOWN_DATE);
                expect(meeting).toHaveProperty('races'); // Ensure races are still included
            });
        });

        // Test 4: Filter by dateFrom
        it('should filter meetings by dateFrom', async () => {
            if (KNOWN_DATE_FROM === 'YYYY-MM-DD') {
                console.warn("WARN: KNOWN_DATE_FROM not set. This test might fail. Please update tests/meetings.test.js with a real date.");
            }
            const res = await request(app)
                .get(`/api/meetings?dateFrom=${KNOWN_DATE_FROM}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            const fromDate = new Date(KNOWN_DATE_FROM);
            res.body.forEach(meeting => {
                const meetingDate = new Date(meeting.meetingDate);
                expect(meetingDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
            });
        });

        // Test 5: Filter by dateTo
        it('should filter meetings by dateTo', async () => {
            if (KNOWN_DATE_TO === 'YYYY-MM-DD') {
                console.warn("WARN: KNOWN_DATE_TO not set. This test might fail. Please update tests/meetings.test.js with a real date.");
            }
            const res = await request(app)
                .get(`/api/meetings?dateTo=${KNOWN_DATE_TO}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            const toDate = new Date(KNOWN_DATE_TO);
            res.body.forEach(meeting => {
                const meetingDate = new Date(meeting.meetingDate);
                expect(meetingDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
            });
        });

        // Test 6: Filter by partial track name
        it('should filter meetings by partial track name', async () => {
            if (KNOWN_TRACK_NAME_PARTIAL === 'your_track_part') {
                console.warn("WARN: KNOWN_TRACK_NAME_PARTIAL not set. This test might fail. Please update tests/meetings.test.js with a real partial track name.");
            }
            const res = await request(app)
                .get(`/api/meetings?track=${KNOWN_TRACK_NAME_PARTIAL}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(meeting => {
                // Ensure the meeting name contains the partial track name (case-insensitive check)
                expect(meeting.meetingName.toLowerCase()).toContain(KNOWN_TRACK_NAME_PARTIAL.toLowerCase());
            });
        });

        // Test 7: Filter by multiple criteria (date and track)
        it('should filter meetings by date and track', async () => {
            if (KNOWN_DATE === 'YYYY-MM-DD' || KNOWN_FULL_TRACK_NAME === 'your_full_track_name') {
                console.warn("WARN: KNOWN_DATE or KNOWN_FULL_TRACK_NAME not set. This test might fail. Please update tests/meetings.test.js with real data combinations.");
            }
            const res = await request(app)
                .get(`/api/meetings?date=${KNOWN_DATE}&track=${KNOWN_FULL_TRACK_NAME}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(0); // Could be 0 if combination is rare
            res.body.forEach(meeting => {
                const meetingDate = new Date(meeting.meetingDate).toISOString().split('T')[0];
                expect(meetingDate).toBe(KNOWN_DATE);
                expect(meeting.meetingName.toLowerCase()).toBe(KNOWN_FULL_TRACK_NAME.toLowerCase()); // Exact match check if using full name
            });
        });

        // Test 8: No matching meetings
        it('should return an empty array if no meetings match the criteria', async () => {
            const res = await request(app)
                .get(`/api/meetings?date=${DATE_WITH_NO_MEETINGS}&track=${NON_EXISTENT_TRACK}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        // Test 9: Internal server error handling
        it('should handle internal server error', async () => {
            // Temporarily mock pool.request().query() to throw an error
            const spyOnPoolRequest = jest.spyOn(pool, 'request');
            const mockRequest = {
                input: jest.fn().mockReturnThis(),
                query: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Simulated DB error');
                })
            };
            spyOnPoolRequest.mockReturnValueOnce(mockRequest);

            const res = await request(app)
                .get('/api/meetings')
                .expect(500);

            expect(res.text).toBe('Internal server error');
            spyOnPoolRequest.mockRestore(); // Restore original implementation
        });

        // Test 10: Verify presence of conditions data and nested races
        it('should return meetings with track conditions and nested races', async () => {
            if (KNOWN_DATE === 'YYYY-MM-DD' || KNOWN_MEETING_ID_WITH_RACES === null) {
                console.warn("WARN: KNOWN_DATE or KNOWN_MEETING_ID_WITH_RACES not set. This test might fail. Please update tests/meetings.test.js with real data.");
            }
            const res = await request(app)
                .get(`/api/meetings?date=${KNOWN_DATE}&pageSize=1`) // Fetch one meeting to make checks easier
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            const meeting = res.body.find(m => m.meetingId === KNOWN_MEETING_ID_WITH_RACES) || res.body[0]; // Find by known ID or take first
            expect(meeting).toBeDefined();

            // Check for properties from pf_conditions
            expect(meeting).toHaveProperty('trackCondition');
            expect(meeting).toHaveProperty('trackConditionNumber');
            expect(meeting).toHaveProperty('trackRail');
            expect(meeting).toHaveProperty('weather');
            expect(meeting).toHaveProperty('irrigation');
            expect(meeting).toHaveProperty('rainfall');
            expect(meeting).toHaveProperty('conditionsLastUpdate'); // New field

            // Check for nested races
            expect(meeting).toHaveProperty('races');
            expect(Array.isArray(meeting.races)).toBe(true);
            expect(meeting.races.length).toBeGreaterThan(0); // Expect at least one race for a real meeting

            const race = meeting.races[0];
            expect(race).toHaveProperty('raceId');
            expect(race).toHaveProperty('raceNumber');
            expect(race).toHaveProperty('raceName');
            expect(race.meetingId).toBe(meeting.meetingId); // Ensure race is correctly mapped
            // Add more race property checks if desired
        });
    });
});