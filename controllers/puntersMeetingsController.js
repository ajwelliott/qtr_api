const axios = require('axios');
const fs = require('fs').promises; // Use fs.promises for async file operations
require('dotenv').config();

// --- CONFIGURATION ---
const API_CONFIG = {
  puntersUrl: 'https://puntapi.com/racing',
  headers: {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer none",
    "content-type": "application/json",
    "origin": "https://www.punters.com.au",
    "priority": "u=1, i",
    "referer": "https://www.punters.com.au/",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
  },
};

// --- HELPER FUNCTIONS ---

/**
 * Formats a given Date object into a 'YYYY-MM-DD' string.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string.
 */
function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- CONTROLLER FUNCTIONS ---

/**
 * Fetches all meetings for a specific date from the Punters API.
 * This function removes any restrictions on fields to retrieve the full data structure.
 * @param {string} dateString - The date in 'YYYY-MM-DD' format.
 * @returns {Promise<Array|null>} A promise that resolves to an array of meeting objects, or null if an error occurs.
 */
async function getMeetingsForDate(dateString) {
    console.log(`\n🚀 Fetching meeting list for ${dateString}...`);
    const targetDate = new Date(`${dateString}T00:00:00Z`); // Use Z for UTC to avoid timezone issues
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(targetDate.getDate() - 1);
    const startTime = `${getFormattedDate(dayBefore)}T14:00:00Z`; // Start time for the query range
    const endTime = `${dateString}T12:59:59.999Z`; // End time for the query range

    // Variables for the GraphQL query. Removed 'isTopFour' and 'meetingCategory' to get all fields.
    const variables = {
        brand: "punters",
        endTime,
        sport: "HorseRacing",
        startTime
    };
    // Persisted query hash for the API endpoint. This might need to be updated if the API changes.
    const extensions = {
        persistedQuery: {
            version: 1,
            sha256Hash: "ddea43c96aff80097730c1cea2b715459febf6eea4bf3ee6d8f09eee7c271c9c"
        }
    };
    // Parameters for the GET request
    const params = {
        operationName: "meetingsIndexByStartEndTime",
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions)
    };

    try {
        const res = await axios.get(API_CONFIG.puntersUrl, { params, headers: API_CONFIG.headers });
        const allMeetings = res.data?.data?.meetings;

        if (allMeetings) {
            console.log(`✅ Success! Found ${allMeetings.length} meetings.`);
            // Save the raw data to a JSON file
            const fileName = `meetings_${dateString}.json`;
            await fs.writeFile(fileName, JSON.stringify(allMeetings, null, 2));
            console.log(`💾 Meetings data saved to ${fileName}`);
            return allMeetings;
        } else {
            console.log("No meetings data received from the API.");
            return [];
        }
    } catch (error) {
        console.error(`❌ Failed to fetch meeting list:`, error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return null;
    }
}

module.exports = {
    getMeetingsForDate,
    getFormattedDate // Exporting for potential use in other controllers or a main script
};
