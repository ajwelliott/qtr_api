const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const API_CONFIG = {
  baseUrl: 'https://puntapi.com/odds/au/event',
  headers: {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer none",
    "content-type": "application/json",
    "origin": "https://www.punters.com.au",
    "referer": "https://www.punters.com.au/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0.0.0 Safari/537.36"
  }
};

// --- INPUT ---
const eventId = '2070279';  // replace this with the desired event ID
const outputPath = path.join(__dirname, `event_${eventId}_odds.json`);

// --- FETCH FUNCTION ---
async function fetchOdds(eventId) {
  const url = `${API_CONFIG.baseUrl}/${eventId}?priceFluctuations=50&type=best,bookmaker,average&betTypes=fixed-place,&bookmaker=bet365,ubet,tabtouch,betr,boombet,sportsbet,picklebet,pointsbet,ladbrokes,neds,colossalbet,average`;

  try {
    const response = await axios.get(url, { headers: API_CONFIG.headers });
    const data = response.data;

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved odds data to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error fetching odds:', error.message);
  }
}

fetchOdds(eventId);
