const axios = require('axios');
const sql = require('mssql');
const dayjs = require('dayjs');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: true
  }
};

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

async function getOddsForEvent(req, res) {
  const { eventId } = req.params;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId parameter' });

  console.log(`📡 Received request to fetch odds for eventId: ${eventId}`);

  try {
    const url = `${API_CONFIG.baseUrl}/${eventId}?priceFluctuations=50&type=bookmaker&betTypes=fixed-place,fixed-win&bookmaker=bet365,ubet,tabtouch,betr,boombet,sportsbet,picklebet,pointsbet,ladbrokes,neds,colossalbet,average`;
    const response = await axios.get(url, { headers: API_CONFIG.headers });
    const data = response.data;

    if (!data || !Array.isArray(data.odds)) {
      console.warn(`⚠ No valid odds data returned for event ${eventId}`);
      return res.status(204).json({ message: 'No odds data found in response.' });
    }

    const pool = await sql.connect(dbConfig);
    let insertedCount = 0;

    for (const entry of data.odds) {
      const { selectionId, betType, bookmakerId, price } = entry;
      if (!price?.fluctuations || !Array.isArray(price.fluctuations)) continue;

      for (const fluc of price.fluctuations) {
        const fluctuationTime = fluc.updatedAt ? dayjs(fluc.updatedAt).toDate() : null;

        console.log('📝 Inserting odds:', {
          event_id: eventId,
          selection_id: selectionId,
          bet_type: betType,
          bookmaker_id: bookmakerId,
          price: fluc.value,
          rolling_mean_deviation: fluc.rollingMeanDeviation,
          fluctuation_time: fluctuationTime
        });

await pool.request()
  .input('event_id', sql.VarChar, String(eventId))
  .input('selection_id', sql.VarChar, String(selectionId))
  .input('bet_type', sql.VarChar, String(betType))
  .input('bookmaker_id', sql.VarChar, String(bookmakerId))
  .input('price', sql.Float, fluc.value ?? null)
  .input('rolling_mean_deviation', sql.Float, fluc.rollingMeanDeviation ?? null)
  .input('fluctuation_time', sql.DateTime, fluctuationTime)
  .input('last_updated', sql.DateTime, new Date())
  .query(`
    MERGE punters_odds AS target
    USING (SELECT 
        @event_id AS event_id,
        @selection_id AS selection_id,
        @bet_type AS bet_type,
        @bookmaker_id AS bookmaker_id,
        @price AS price,
        @rolling_mean_deviation AS rolling_mean_deviation,
        @fluctuation_time AS fluctuation_time,
        @last_updated AS last_updated
    ) AS source
    ON target.event_id = source.event_id
      AND target.selection_id = source.selection_id
      AND target.bet_type = source.bet_type
      AND target.bookmaker_id = source.bookmaker_id
      AND target.fluctuation_time = source.fluctuation_time
    WHEN MATCHED THEN
      UPDATE SET 
        price = source.price,
        rolling_mean_deviation = source.rolling_mean_deviation,
        last_updated = source.last_updated
    WHEN NOT MATCHED THEN
      INSERT (
        event_id, selection_id, bet_type, bookmaker_id,
        price, rolling_mean_deviation, fluctuation_time, last_updated
      )
      VALUES (
        source.event_id, source.selection_id, source.bet_type, source.bookmaker_id,
        source.price, source.rolling_mean_deviation, source.fluctuation_time, source.last_updated
      );
  `);


        insertedCount++;
      }
    }

    return res.status(200).json({ inserted: insertedCount });
  } catch (err) {
    console.error(`❌ Error fetching odds for event ${req.params.eventId}:`, err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getOddsForEvent };
