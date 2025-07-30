const axios = require('axios');
const fs = require('fs').promises;
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

const ALLOWED_COUNTRIES = ['Australia', 'New Zealand', 'Hong Kong'];

// --- HELPER FUNCTIONS ---
function getFormattedDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- MAIN CONTROLLER ---
async function getMeetingsForDate(date, options = { saveToFile: true }) {
  console.log(`\n🚀 Fetching meeting list for ${date}...`);

  const targetDate = new Date(`${date}T00:00:00Z`);
  const dayBefore = new Date(targetDate);
  dayBefore.setDate(targetDate.getDate() - 1);

  const startTime = `${getFormattedDate(dayBefore)}T14:00:00Z`;
  const endTime = `${date}T12:59:59.999Z`;

  const variables = {
    brand: "punters",
    sport: "HorseRacing",
    startTime,
    endTime
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: "ddea43c96aff80097730c1cea2b715459febf6eea4bf3ee6d8f09eee7c271c9c"
    }
  };

  const params = {
    operationName: "meetingsIndexByStartEndTime",
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions)
  };

  try {
    const res = await axios.get(API_CONFIG.puntersUrl, {
      params,
      headers: API_CONFIG.headers
    });

    const allMeetings = res.data?.data?.meetings;

    if (Array.isArray(allMeetings)) {
      const filtered = allMeetings.filter(m => {
        const country = m?.venue?.country?.name || '';
        return ALLOWED_COUNTRIES.includes(country);
      });

      console.log(`✅ Success! Found ${filtered.length} meetings in ${ALLOWED_COUNTRIES.join(', ')}`);

      if (options.saveToFile) {
        const filename = `meetings_${date}.json`;
        await fs.writeFile(filename, JSON.stringify(filtered, null, 2));
        console.log(`💾 Filtered meetings data saved to ${filename}`);
      }

      return { meetings: filtered };
    } else {
      console.log("⚠️ No meetings data received from the API.");
      return { meetings: [] };
    }
  } catch (error) {
    console.error(`❌ Failed to fetch meeting list:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { meetings: [] };
  }
}

// --- RANGE WRAPPER ---
async function getMeetingsForDateRange(startOffset = 0, endOffset = 0) {
  const results = [];

  for (let offset = startOffset; offset <= endOffset; offset++) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const formattedDate = getFormattedDate(date);

    const { meetings } = await getMeetingsForDate(formattedDate, { saveToFile: false });
    results.push({ date: formattedDate, meetings });
  }

  return results;
}

module.exports = {
  getMeetingsForDate,
  getMeetingsForDateRange,
  getFormattedDate,
  ALLOWED_COUNTRIES,
  API_CONFIG
};
