// scripts/fetchFullPuntersData.js
const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

// ✅ Centralised API config
const API_CONFIG = {
  puntersUrl: 'https://puntapi.com/racing',
  headers: {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    authorization: 'Bearer none',
    'content-type': 'application/json',
    origin: 'https://www.punters.com.au',
    priority: 'u=1, i',
    referer: 'https://www.punters.com.au/',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  }
};

const ALLOWED_COUNTRIES = ['Australia', 'New Zealand', 'Hong Kong'];

function getFormattedDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function fetchMeetingList(date) {
  const startTime = `${date}T00:00:00Z`;
  const endTime = `${date}T23:59:59Z`;

  const params = {
    operationName: 'meetingsIndexByStartEndTime',
    variables: JSON.stringify({
      brand: 'punters',
      sport: 'HorseRacing',
      startTime,
      endTime
    }),
    extensions: JSON.stringify({
      persistedQuery: {
        version: 1,
        sha256Hash: 'ddea43c96aff80097730c1cea2b715459febf6eea4bf3ee6d8f09eee7c271c9c'
      }
    })
  };

  const res = await axios.get(API_CONFIG.puntersUrl, {
    headers: API_CONFIG.headers,
    params
  });

  return res.data?.data?.meetings?.filter(
    m => ALLOWED_COUNTRIES.includes(m?.venue?.country?.name)
  ) || [];
}

async function run() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatted = getFormattedDate(tomorrow);

  log(`Fetching meeting list for ${formatted}`);

  const meetings = await fetchMeetingList(formatted);

  await fs.writeFile('punters_meeting_list.json', JSON.stringify(meetings, null, 2));
  log(`✅ Saved ${meetings.length} meetings to punters_meeting_list.json`);
}

run().catch(err => console.error('❌ Script error:', err));
