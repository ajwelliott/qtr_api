const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const API_CONFIG = {
  puntersUrl: 'https://puntapi.com/racing',
  headers: {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer none",
    "content-type": "application/json",
    "origin": "https://www.punters.com.au",
    "referer": "https://www.punters.com.au/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0.0.0 Safari/537.36"
  },
};

async function fetchEventDetails(eventId) {
  const variables = {
    brand: "punters",
    brandEnum: "punters",
    eventId: eventId
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: "1208f445f68dbd694b26c8d0e4d1cad7112e80f9e3bbc61d672de2610f261f94"
    }
  };

  const params = {
    operationName: "getEventById",
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions)
  };

  try {
    const res = await axios.get(API_CONFIG.puntersUrl, {
      params,
      headers: API_CONFIG.headers
    });

    const filePath = path.join(__dirname, 'event_response.json');
    fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2));
    console.log(`✅ Event data saved to ${filePath}`);
  } catch (err) {
    console.error("❌ Failed to fetch event:", err.message);
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    }
  }
}

// 🔍 Replace with a real event ID from your data
fetchEventDetails("1947300");
