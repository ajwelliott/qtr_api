// This file contains automated Jest tests for puntersMeetingsController.js

// Mock axios and fs.promises before importing the controller
const axios = require('axios');
const fs = require('fs').promises;

// Mock the required modules
jest.mock('axios');
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
    },
}));

// Import the functions under test after mocking
const {
    getMeetingsForDate,
    getMeetingsForDateRange
} = require('../controllers/puntersMeetingsController');

describe('puntersMeetingsController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getMeetingsForDate should fetch meetings and save them to a JSON file', async () => {
        const mockDate = '2025-07-08';
        const mockMeetingsData = [
            { id: 'm1', name: 'Meeting A', venue: { country: { name: 'Australia' } } },
            { id: 'm2', name: 'Meeting B', venue: { country: { name: 'Australia' } } },
        ];

        axios.get.mockResolvedValueOnce({
            data: {
                data: {
                    meetings: mockMeetingsData,
                },
            },
        });

        const result = await getMeetingsForDate(mockDate);

        // ✅ Check axios.get was called with correct endpoint and params
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
            'https://puntapi.com/racing',
            expect.objectContaining({
                params: expect.objectContaining({
                    operationName: 'meetingsIndexByStartEndTime',
                    variables: expect.any(String),
                    extensions: expect.any(String),
                }),
            })
        );

        // ✅ Parse variables and extensions to validate important keys
        const calledParams = axios.get.mock.calls[0][1].params;
        const parsedVars = JSON.parse(calledParams.variables);
        expect(parsedVars.startTime).toBe('2025-07-07T14:00:00Z');
        expect(parsedVars.endTime).toBe('2025-07-08T12:59:59.999Z');

        const parsedExt = JSON.parse(calledParams.extensions);
        expect(parsedExt.persistedQuery.sha256Hash).toBe('ddea43c96aff80097730c1cea2b715459febf6eea4bf3ee6d8f09eee7c271c9c');

        // ✅ Confirm file write
        const expectedFileName = `meetings_${mockDate}.json`;
        expect(fs.writeFile).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).toHaveBeenCalledWith(
            expectedFileName,
            JSON.stringify(mockMeetingsData, null, 2)
        );

        // ✅ Function returns correct result
        expect(result).toEqual(mockMeetingsData);
    });

    test('getMeetingsForDate should return an empty array if no meetings are found', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                data: {
                    meetings: [],
                },
            },
        });

        const result = await getMeetingsForDate('2025-01-01');

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
    });

    test('getMeetingsForDate should return null and log an error on API failure', async () => {
        const errorMessage = 'Network Error';
        axios.get.mockRejectedValueOnce(new Error(errorMessage));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getMeetingsForDate('2025-07-09');

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to fetch meeting list:'),
            expect.stringContaining(errorMessage)
        );

        consoleErrorSpy.mockRestore();
    });

    test('getMeetingsForDateRange should fetch and return meetings across a date range', async () => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const mockDates = [
            today.toISOString().slice(0, 10),
            tomorrow.toISOString().slice(0, 10)
        ];

        const mockMeetingsData = [
            { id: 'm1', name: 'Meeting X', venue: { country: { name: 'Australia' } } }
        ];

        axios.get.mockResolvedValue({
            data: {
                data: {
                    meetings: mockMeetingsData,
                },
            },
        });

        const results = await getMeetingsForDateRange(0, 1);

        expect(results.length).toBe(2);
        expect(results[0]).toHaveProperty('date', mockDates[0]);
        expect(results[0]).toHaveProperty('meetings');
        expect(results[1]).toHaveProperty('date', mockDates[1]);
        expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
});
