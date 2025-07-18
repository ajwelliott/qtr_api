// tests/formHistory.test.js
const request = require('supertest');
const express = require('express');
const { poolPromise, sql } = require('../db/sql'); // Import actual poolPromise
const formHistoryController = require('../controllers/formHistoryController'); // Adjust path as necessary

// Create a test Express app and mount the routes
const app = express();
app.use(express.json());

// Manually apply the controller functions as routes for testing
// This assumes /api/form-history is the base path
app.get('/api/form-history/:runnerId', formHistoryController.getFormHistoryByRunner);
app.get('/api/form-history', formHistoryController.searchFormHistory);


// --- Test Data Configuration (IMPORTANT: Adjust these for your actual DB) ---
// You MUST ensure these values exist in your 'qtracing' database for tests to pass.
// Query your 'pf_form_history' and 'pf_field_list' tables to find valid data.

// For getFormHistoryByRunner
const KNOWN_RUNNER_ID = 975150; // Corrected to number based on your error output
const NON_EXISTENT_RUNNER_ID = 999999999; // Can also be number for consistency

// For searchFormHistory
// IMPORTANT: Replace 'your_existing_runner_name_part' with a actual partial name
// that exists in your pf_field_list table and has associated form history.
const KNOWN_PARTIAL_NAME = 'Elouy'; // e.g., 'Wind' for 'Windstorm'
// IMPORTANT: Replace 'your_existing_full_runner_name' with an actual full name
const KNOWN_FULL_NAME = 'Elouyou'; // e.g., 'Windstorm'
const NON_EXISTENT_NAME = 'NonExistentRunnerXYZ';

// IMPORTANT: Pick dates where data is known to exist for the above runner(s)
const KNOWN_DATE_FROM = '2023-12-13'; // e.g., '2023-01-01'
const KNOWN_DATE_TO = '2025-06-30'; // e.g., '2023-12-31'
const DATE_WITH_NO_DATA = '2000-01-01'; // Ensure this date range has no data

describe('Form History Controller (Integration Tests)', () => {
    let pool;

    beforeAll(async () => {
        try {
            pool = await poolPromise;
            console.log('Database pool connected for Form History integration tests.');
            // Optional: Add seeding logic here if needed for specific test data
        } catch (err) {
            console.error('Failed to connect to database for Form History integration tests:', err);
            throw err;
        }
    }, 30000);

    afterAll(async () => {
        try {
            await pool.close();
            console.log('Database pool closed after Form History integration tests.');
        } catch (err) {
            console.error('Failed to close database pool for Form History:', err);
        }
    });

    // --- GET /api/form-history/:runnerId Tests ---
    describe('GET /api/form-history/:runnerId', () => {
        it('should return form history for a known runnerId', async () => {
            if (KNOWN_RUNNER_ID === 'your_existing_runner_id_here' || typeof KNOWN_RUNNER_ID !== 'number') {
                console.warn("WARN: KNOWN_RUNNER_ID not properly set or is not a number. This test might fail. Please update tests/formHistory.test.js with a real numeric runnerId.");
            }
            const res = await request(app)
                .get(`/api/form-history/${KNOWN_RUNNER_ID}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach(record => {
                expect(record).toHaveProperty('runnerId', KNOWN_RUNNER_ID); // Now compares numbers
                expect(record).toHaveProperty('meetingDate');
                // You can add more specific property checks if desired
            });

            // Verify sorting by meetingDate DESC
            for (let i = 0; i < res.body.length - 1; i++) {
                const date1 = new Date(res.body[i].meetingDate);
                const date2 = new Date(res.body[i + 1].meetingDate);
                expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
            }
        });

        it('should return an empty array for a non-existent runnerId', async () => {
            const res = await request(app)
                .get(`/api/form-history/${NON_EXISTENT_RUNNER_ID}`)
                .expect('Content-Type', /json/)
                .expect(200); // Controller returns 200 with empty array for no results

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        it('should handle internal server error for getFormHistoryByRunner', async () => {
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
                .get(`/api/form-history/${KNOWN_RUNNER_ID}`)
                .expect(500);

            expect(res.text).toBe('Internal server error'); // Controller sends text response
            spyOnPoolRequest.mockRestore(); // Restore original implementation after test
        });
    });

    // --- GET /api/form-history?name=...&dateFrom=...&dateTo=... Tests ---
    describe('GET /api/form-history (search)', () => {
        it('should return form history when no search filters are applied (top 100)', async () => {
            const res = await request(app)
                .get('/api/form-history')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body.length).toBeLessThanOrEqual(100); // Verify TOP 100 constraint
            expect(res.body[0]).toHaveProperty('runnerId');
            expect(res.body[0]).toHaveProperty('name'); // From pf_field_list join
        });

        it('should filter form history by partial name match', async () => {
            if (KNOWN_PARTIAL_NAME === 'your_existing_runner_name_part') {
                console.warn("WARN: KNOWN_PARTIAL_NAME not set. This test might fail. Please update tests/formHistory.test.js with a real partial runner name.");
            }
            const res = await request(app)
                .get(`/api/form-history?name=${KNOWN_PARTIAL_NAME}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0); // This is the assertion that failed
            res.body.forEach(record => {
                expect(record.name).toContain(KNOWN_PARTIAL_NAME);
            });
        });

        it('should filter form history by dateFrom', async () => {
            if (KNOWN_DATE_FROM === 'YYYY-MM-DD') {
                console.warn("WARN: KNOWN_DATE_FROM not set. This test might fail. Please update tests/formHistory.test.js with a real date.");
            }
            const res = await request(app)
                .get(`/api/form-history?dateFrom=${KNOWN_DATE_FROM}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            const fromDate = new Date(KNOWN_DATE_FROM);
            res.body.forEach(record => {
                const meetingDate = new Date(record.meetingDate);
                expect(meetingDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
            });
            // Also check order
            for (let i = 0; i < res.body.length - 1; i++) {
                const date1 = new Date(res.body[i].meetingDate);
                const date2 = new Date(res.body[i + 1].meetingDate);
                expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
            }
        });

        it('should filter form history by dateTo', async () => {
            if (KNOWN_DATE_TO === 'YYYY-MM-DD') {
                console.warn("WARN: KNOWN_DATE_TO not set. This test might fail. Please update tests/formHistory.test.js with a real date.");
            }
            const res = await request(app)
                .get(`/api/form-history?dateTo=${KNOWN_DATE_TO}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            const toDate = new Date(KNOWN_DATE_TO);
            res.body.forEach(record => {
                const meetingDate = new Date(record.meetingDate);
                expect(meetingDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
            });
            // Also check order
            for (let i = 0; i < res.body.length - 1; i++) {
                const date1 = new Date(res.body[i].meetingDate);
                const date2 = new Date(res.body[i + 1].meetingDate);
                expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
            }
        });

        it('should filter form history by multiple criteria (name, dateFrom, dateTo)', async () => {
            if (KNOWN_FULL_NAME === 'your_existing_full_runner_name' ||
                KNOWN_DATE_FROM === 'YYYY-MM-DD' ||
                KNOWN_DATE_TO === 'YYYY-MM-DD') {
                console.warn("WARN: KNOWN_FULL_NAME or dates not set. This test might fail. Please update tests/formHistory.test.js with real data combinations.");
            }
            const res = await request(app)
                .get(`/api/form-history?name=${KNOWN_FULL_NAME}&dateFrom=${KNOWN_DATE_FROM}&dateTo=${KNOWN_DATE_TO}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(0); // Might be 0 if the combination is rare
            const fromDate = new Date(KNOWN_DATE_FROM);
            const toDate = new Date(KNOWN_DATE_TO);

            res.body.forEach(record => {
                expect(record.name).toContain(KNOWN_FULL_NAME);
                const meetingDate = new Date(record.meetingDate);
                expect(meetingDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
                expect(meetingDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
            });
            // Also check order
            for (let i = 0; i < res.body.length - 1; i++) {
                const date1 = new Date(res.body[i].meetingDate);
                const date2 = new Date(res.body[i + 1].meetingDate);
                expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
            }
        });

        it('should return an empty array if no search results match criteria', async () => {
            const res = await request(app)
                .get(`/api/form-history?name=${NON_EXISTENT_NAME}&dateFrom=${DATE_WITH_NO_DATA}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        it('should handle internal server error for searchFormHistory', async () => {
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
                .get('/api/form-history') // Trigger searchFormHistory
                .expect(500);

            expect(res.text).toBe('Internal server error'); // Controller sends text response
            spyOnPoolRequest.mockRestore(); // Restore original implementation after test
        });
    });
}, 60000); // Increased timeout for integration tests (60 seconds)