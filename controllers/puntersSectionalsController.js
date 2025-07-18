const axios = require('axios');
const fs = require('fs').promises; // Use promise-based fs for async operations
require('dotenv').config(); // Ensure dotenv is configured if not already in your main app.js

// --- HELPER FUNCTIONS ---
function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- CONFIGURATION ---
const API_CONFIG = {
  puntersUrl: 'https://puntapi.com/racing',
  headers: {
    "accept": "*/*",
    "authorization": "Bearer none", // IMPORTANT: If you have a real API key, use it here or from process.env
    "content-type": "application/json",
    "origin": "https://www.punters.com.au",
    "referer": "https://www.punters.com.au/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
  },
  // Dynamically set defaultDate to today's date
  defaultDate: getFormattedDate(new Date()),
  outputFile: 'fetched_sectional_data.json' // File to save the output
};


// --- API FUNCTIONS (adapted from your sectionals.js) ---

async function fetchMeetingList(date) {
    console.log(`\n🚀 Fetching meeting list for ${date}...`);
    const targetDate = new Date(`${date}T00:00:00Z`);
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(targetDate.getDate() - 1);
    const startTime = `${getFormattedDate(dayBefore)}T14:00:00Z`;
    const endTime = `${date}T12:59:59.999Z`;

    // Temporarily removed 'isTopFour' and 'meetingCategory' for broader search
    // Also logging params and raw response for debugging
    const variables = { brand: "punters", endTime, sport: "HorseRacing", startTime };
    const extensions = { persistedQuery: { version: 1, sha256Hash: "ddea43c96aff80097730c1cea2b715459febf6eea4bf3ee6d8f09eee7c271c9c" } };
    const params = { operationName: "meetingsIndexByStartEndTime", variables: JSON.stringify(variables), extensions: JSON.stringify(extensions) };

    console.log('DEBUG: API Request Params:', JSON.stringify(params, null, 2));

    try {
        const res = await axios.get(API_CONFIG.puntersUrl, { params, headers: API_CONFIG.headers });
        console.log('DEBUG: Raw API Response Data:', JSON.stringify(res.data, null, 2)); // Log raw response

        // Temporarily removed country filter to see all results
        const meetings = res.data?.data?.meetings ?? []; // Removed .filter(m => m?.venue?.country?.name === 'Australia')
        console.log(`✅ Success! Found ${meetings.length} meetings (country filter temporarily removed).`);
        return meetings;
    } catch (error) {
        console.error(`❌ Failed to fetch meeting list:`, error.message);
        return null;
    }
}

async function fetchSectionals(selectionIds) {
    console.log(`\n🔎 Fetching historical form & sectionals for ${selectionIds.length} runners...`);
    if (selectionIds.length === 0) return null;

    const variables = { selectionIds };
    const extensions = {
        persistedQuery: { version: 1, sha256Hash: "30fdad94a3a7256f1a98b824e58a3894cf605f6d87b8d611e62014db1d1be937" }
    };
    const params = {
        operationName: "getSectionalsBySelectionIds",
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions)
    };

    try {
        const res = await axios.get(API_CONFIG.puntersUrl, { params, headers: API_CONFIG.headers });
        const competitorForms = res.data?.data?.competitorForms;
        if (Array.isArray(competitorForms)) {
            console.log(`✅ Success. Found form data for ${competitorForms.length} runners.`);
            return competitorForms;
        }
        console.log("Could not find 'competitorForms' in the response.");
        return null;
    } catch (error) {
        console.error(`❌ Failed to fetch sectional data:`, error.message);
        return null;
    }
}

// --- NEW CONTROLLER FUNCTION ---
const fetchAndProcessSectionalData = async (req, res) => {
    console.log('📥 Request: GET /api/sectional-data/fetch');
    try {
        // Optional: Allow date to be passed as a query parameter, otherwise use default
        const dateToFetch = req.query.date || API_CONFIG.defaultDate;

        const meetings = await fetchMeetingList(dateToFetch);

        if (!meetings || meetings.length === 0) {
            console.log("No meetings found for the specified date. Halting sectional data fetch.");
            return res.status(200).json({ message: 'No meetings found or data could not be retrieved.' });
        }

        const allSectionalData = [];

        // Iterate through each meeting
        for (const meeting of meetings) {
            console.log(`\nProcessing Meeting: ${meeting.name} (${meeting.meetingId}) on ${meeting.meetingDate}`);

            // Iterate through each race in the meeting
            for (const race of meeting.events || []) { // Use .events for races, provide fallback if null
                console.log(`  Processing Race: ${race.eventNumber} - ${race.name} (${race.id})`);

                // Collect all selectionIds (runner IDs) for the current race
                const selectionIds = race.selections.map(runner => runner.id);

                if (selectionIds.length > 0) {
                    const sectionalDataForRace = await fetchSectionals(selectionIds);

                    if (sectionalDataForRace) {
                        // Attach meeting and race context to each runner's sectional data
                        const processedData = sectionalDataForRace.map(runnerData => ({
                            meetingId: meeting.meetingId,
                            meetingName: meeting.name,
                            meetingDate: meeting.meetingDate,
                            raceId: race.id,
                            raceNumber: race.eventNumber,
                            runnerId: runnerData.selectionId, // The ID of the runner from the sectionals API
                            runnerName: runnerData.selectionName, // Name of the runner from the sectionals API
                            // Include all forms data for this runner
                            forms: runnerData.forms
                        }));
                        allSectionalData.push(...processedData); // Add all processed runners to the main array
                    } else {
                        console.warn(`    No sectional data found for race ${race.id} in meeting ${meeting.meetingId}.`);
                    }
                } else {
                    console.warn(`    No runners found for race ${race.id} in meeting ${meeting.meetingId}.`);
                }
            }
        }

        console.log('\n--- ALL SECTIONAL DATA COLLECTED ---');
        console.log(`Total runners with sectional data: ${allSectionalData.length}`);

        // 1. Log to console
        console.log('Full Sectional Data (JSON):');
        console.log(JSON.stringify(allSectionalData, null, 2));

        // 2. Save to file
        await fs.writeFile(API_CONFIG.outputFile, JSON.stringify(allSectionalData, null, 2));
        console.log(`✅ Sectional data saved to ${API_CONFIG.outputFile}`);

        res.status(200).json({
            message: `Successfully fetched and processed sectional data for ${allSectionalData.length} runners. Data saved to ${API_CONFIG.outputFile}.`,
            totalRunnersProcessed: allSectionalData.length,
            // You might return a summary or the first few items, but not the whole array for very large datasets
            // data: allSectionalData.slice(0, 5) // Return first 5 for quick preview
        });

    } catch (error) {
        console.error('❌ Error in fetchAndProcessSectionalData:', error);
        res.status(500).send('Internal server error during sectional data fetch.');
    }
};

module.exports = {
    fetchAndProcessSectionalData
};
