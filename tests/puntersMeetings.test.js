// This file contains automated Jest tests for puntersMeetingsController.js

// Mock axios and fs.promises before importing the controller
// This ensures that actual network requests and file system operations are not performed during tests.
const axios = require('axios');
const fs = require('fs').promises;

// Jest's mock functions allow us to control the behavior of imported modules
jest.mock('axios');
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(), // Mock the writeFile function
    },
}));

// Now import the controller after mocking its dependencies
const { getMeetingsForDate } = require('../controllers/puntersMeetingsController');

describe('puntersMeetingsController', () => {
    // Clear all mocks before each test to ensure a clean slate
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getMeetingsForDate should fetch meetings and save them to a JSON file', async () => {
        const mockDate = '2025-07-08';
        const mockMeetingsData = [
            { id: 'm1', name: 'Meeting A', venue: { country: { name: 'Australia' } } },
            { id: 'm2', name: 'Meeting B', venue: { country: { name: 'Australia' } } },
        ];

        // Configure the mocked axios.get to return our mock data
        axios.get.mockResolvedValueOnce({
            data: {
                data: {
                    meetings: mockMeetingsData,
                },
            },
        });

        // Call the function under test
        const result = await getMeetingsForDate(mockDate);

        // Assertions:
        // 1. Check if axios.get was called with the correct URL and parameters
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
            'https://puntapi.com/racing',
            expect.objectContaining({
                params: expect.objectContaining({
                    operationName: 'meetingsIndexByStartEndTime',
                    variables: expect.stringContaining(`"startTime":"2025-07-07T14:00:00Z","endTime":"2025-07-08T12:59:59.999Z"`),
                    extensions: expect.stringContaining(`"sha256Hash":"ddea43c96aff80097730c1cea2b715459febf6eea4bf3ee6d8f09eee7c271c9c"`),
                }),
            })
        );

        // 2. Check if fs.promises.writeFile was called to save the JSON file
        const expectedFileName = `meetings_${mockDate}.json`;
        expect(fs.writeFile).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).toHaveBeenCalledWith(
            expectedFileName,
            JSON.stringify(mockMeetingsData, null, 2)
        );

        // 3. Check if the function returned the expected meeting data
        expect(result).toEqual(mockMeetingsData);
    });

    test('getMeetingsForDate should return an empty array if no meetings are found', async () => {
        // Configure axios.get to return an empty meetings array
        axios.get.mockResolvedValueOnce({
            data: {
                data: {
                    meetings: [],
                },
            },
        });

        const result = await getMeetingsForDate('2025-01-01');

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).toHaveBeenCalledTimes(1); // Still attempts to write an empty array
        expect(result).toEqual([]);
    });

    test('getMeetingsForDate should return null and log an error on API failure', async () => {
        // Configure axios.get to throw an error
        const errorMessage = 'Network Error';
        axios.get.mockRejectedValueOnce(new Error(errorMessage));

        // Mock console.error to prevent it from polluting test output and to assert it was called
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getMeetingsForDate('2025-07-09');

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).not.toHaveBeenCalled(); // No file written on error
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to fetch meeting list:'),
            expect.stringContaining(errorMessage)
        );

        // Restore original console.error
        consoleErrorSpy.mockRestore();
    });
});
