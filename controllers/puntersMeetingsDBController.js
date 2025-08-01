// puntersMeetingsDBController.js (final integrated version)
require('dotenv').config();
const sql = require('mssql');
const dayjs = require('dayjs');
const axios = require('axios');
const { getMeetingsForDate } = require('./puntersMeetingsController');
const flattenMeeting = require('../utils/flattenMeeting');
const flattenRunnersFromEvent = require('../utils/flattenRunnersFromEvent');

const PUNTERS_API_URL = 'https://puntapi.com/racing';
const HEADERS = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9",
  "authorization": "Bearer none",
  "content-type": "application/json",
  "origin": "https://www.punters.com.au",
  "referer": "https://www.punters.com.au/",
  "user-agent": "Mozilla/5.0"
};

// --- Ensure required env vars are present ---
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE', 'DB_PORT'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
}

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

  const response = await axios.get(PUNTERS_API_URL, { params, headers: HEADERS });
  return response.data?.data?.event;
}

async function insertRunners(pool, runnerRows) {
  for (const row of runnerRows) {
    const columns = Object.keys(row);
    const values = columns.map(col => `@${col}`);

    const mergeSql = `
      MERGE INTO punters_races AS target
      USING (SELECT ${columns.map(col => `@${col} AS ${col}`).join(', ')}) AS source
      ON target.composite_key = source.composite_key
      WHEN MATCHED THEN UPDATE SET ${columns.map(col => `target.${col} = source.${col}`).join(', ')}
      WHEN NOT MATCHED THEN INSERT (${columns.join(', ')}) VALUES (${values.join(', ')});`;

    const request = pool.request();
    for (const col of columns) {
      request.input(col, row[col]);
    }
    await request.query(mergeSql);
  }
}

async function insertExotics(pool, exoticRows) {
  for (const row of exoticRows) {
    const columns = Object.keys(row);
    const values = columns.map(col => `@${col}`);

    const mergeSql = `
      MERGE INTO punters_results AS target
      USING (SELECT ${columns.map(col => `@${col} AS ${col}`).join(', ')}) AS source
      ON target.exotic_id = source.exotic_id
      WHEN MATCHED THEN UPDATE SET ${columns.map(col => `target.${col} = source.${col}`).join(', ')}
      WHEN NOT MATCHED THEN INSERT (${columns.join(', ')}) VALUES (${values.join(', ')});`;

    const request = pool.request();
    for (const col of columns) {
      request.input(col, row[col]);
    }
    await request.query(mergeSql);
  }
}

async function insertMeetingsToDbForDateRange(startOffset, endOffset) {
  const today = dayjs();
  const flattenedMeetings = [];

  for (let offset = startOffset; offset <= endOffset; offset++) {
    const date = today.add(offset, 'day').format('YYYY-MM-DD');
    console.log(`🚀 Fetching and inserting meetings for ${date}...\n`);

    const { meetings } = await getMeetingsForDate(date);

    if (!meetings || !Array.isArray(meetings) || meetings.length === 0) {
      console.log(`⚠️ No meetings data received from the API.\n`);
      continue;
    }

    console.log(`✅ Success! Found ${meetings.length} meetings.`);
    const flattened = meetings.map(flattenMeeting);
    flattenedMeetings.push(...flattened);

    try {
      const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_DATABASE,
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true
        }
      };

      const pool = await sql.connect(dbConfig);

      for (const row of flattened) {
        console.log(`💾 Inserting meeting ${row.meeting_id} (${row.venue_name})`);

        await pool.request()
          .input('meeting_id', sql.NVarChar, row.meeting_id)
          .input('meeting_name', sql.NVarChar, row.meeting_name)
          .input('meeting_slug', sql.NVarChar, row.meeting_slug)
          .input('meeting_category', sql.NVarChar, row.meeting_category)
          .input('meeting_type', sql.NVarChar, row.meeting_type)
          .input('meeting_stage', sql.NVarChar, row.meeting_stage)
          .input('meeting_date_utc', sql.Date, row.meeting_date_utc)
          .input('meeting_date_local', sql.Date, row.meeting_date_local)
          .input('rail_position', sql.NVarChar, row.rail_position)
          .input('region_id', sql.NVarChar, row.region_id)
          .input('sport_id', sql.NVarChar, row.sport_id)
          .input('venue_id', sql.NVarChar, row.venue_id)
          .input('venue_name', sql.NVarChar, row.venue_name)
          .input('venue_slug', sql.NVarChar, row.venue_slug)
          .input('venue_sport_id', sql.NVarChar, row.venue_sport_id)
          .input('venue_state', sql.NVarChar, row.venue_state)
          .input('venue_address', sql.NVarChar, row.venue_address)
          .input('venue_track_map_url', sql.NVarChar, row.venue_track_map_url)
          .input('venue_straight', sql.Int, row.venue_straight)
          .input('venue_straight_unit', sql.NVarChar, row.venue_straight_unit)
          .input('venue_circumference', sql.Int, row.venue_circumference)
          .input('venue_circumference_unit', sql.NVarChar, row.venue_circumference_unit)
          .input('venue_weather_last_updated', sql.DateTime, row.venue_weather_last_updated)
          .input('venue_is_clockwise', sql.Bit, row.venue_is_clockwise)
          .input('country_id', sql.NVarChar, row.country_id)
          .input('country_name', sql.NVarChar, row.country_name)
          .input('country_iso2', sql.NVarChar, row.country_iso2)
          .input('country_iso3', sql.NVarChar, row.country_iso3)
          .input('weather_condition', sql.NVarChar, row.weather_condition)
          .input('weather_condition_icon', sql.NVarChar, row.weather_condition_icon)
          .input('weather_feels_like', sql.NVarChar, row.weather_feels_like)
          .input('weather_humidity', sql.NVarChar, row.weather_humidity)
          .input('weather_temperature', sql.NVarChar, row.weather_temperature)
          .input('weather_temperature_units', sql.NVarChar, row.weather_temperature_units)
          .input('weather_track_condition_overall', sql.NVarChar, row.weather_track_condition_overall)
          .input('weather_track_condition_rating', sql.NVarChar, row.weather_track_condition_rating)
          .input('weather_wind', sql.NVarChar, row.weather_wind)
          .input('weather_wind_speed_units', sql.NVarChar, row.weather_wind_speed_units)
          .input('meeting_date', sql.Date, row.meeting_date)
          .input('venue_country_id', sql.NVarChar, row.venue_country_id)
          .input('venue_country_name', sql.NVarChar, row.venue_country_name)
          .input('venue_country_iso2', sql.NVarChar, row.venue_country_iso2)
          .input('venue_country_iso3', sql.NVarChar, row.venue_country_iso3)
          .input('track_condition_overall', sql.NVarChar, row.track_condition_overall)
          .input('track_condition_rating', sql.NVarChar, row.track_condition_rating)
          .input('created_date', sql.Date, new Date())
          .input('last_updated', sql.DateTime, new Date())
          .query(`
            MERGE punters_meetings AS target
            USING (SELECT @meeting_id AS meeting_id) AS source
            ON target.meeting_id = source.meeting_id
            WHEN MATCHED THEN UPDATE SET
              meeting_name = @meeting_name, meeting_slug = @meeting_slug,
              meeting_category = @meeting_category, meeting_type = @meeting_type,
              meeting_stage = @meeting_stage, meeting_date_utc = @meeting_date_utc,
              meeting_date_local = @meeting_date_local, rail_position = @rail_position,
              region_id = @region_id, sport_id = @sport_id, venue_id = @venue_id,
              venue_name = @venue_name, venue_slug = @venue_slug,
              venue_sport_id = @venue_sport_id, venue_state = @venue_state,
              venue_address = @venue_address, venue_track_map_url = @venue_track_map_url,
              venue_straight = @venue_straight, venue_straight_unit = @venue_straight_unit,
              venue_circumference = @venue_circumference, venue_circumference_unit = @venue_circumference_unit,
              venue_weather_last_updated = @venue_weather_last_updated, venue_is_clockwise = @venue_is_clockwise,
              country_id = @country_id, country_name = @country_name, country_iso2 = @country_iso2,
              country_iso3 = @country_iso3, weather_condition = @weather_condition,
              weather_condition_icon = @weather_condition_icon, weather_feels_like = @weather_feels_like,
              weather_humidity = @weather_humidity, weather_temperature = @weather_temperature,
              weather_temperature_units = @weather_temperature_units,
              weather_track_condition_overall = @weather_track_condition_overall,
              weather_track_condition_rating = @weather_track_condition_rating,
              weather_wind = @weather_wind, weather_wind_speed_units = @weather_wind_speed_units,
              meeting_date = @meeting_date, venue_country_id = @venue_country_id,
              venue_country_name = @venue_country_name, venue_country_iso2 = @venue_country_iso2,
              venue_country_iso3 = @venue_country_iso3, track_condition_overall = @track_condition_overall,
              track_condition_rating = @track_condition_rating, last_updated = @last_updated
            WHEN NOT MATCHED THEN INSERT (
              meeting_id, meeting_name, meeting_slug, meeting_category, meeting_type, meeting_stage,
              meeting_date_utc, meeting_date_local, rail_position, region_id, sport_id,
              venue_id, venue_name, venue_slug, venue_sport_id, venue_state, venue_address,
              venue_track_map_url, venue_straight, venue_straight_unit, venue_circumference,
              venue_circumference_unit, venue_weather_last_updated, venue_is_clockwise,
              country_id, country_name, country_iso2, country_iso3, weather_condition,
              weather_condition_icon, weather_feels_like, weather_humidity, weather_temperature,
              weather_temperature_units, weather_track_condition_overall, weather_track_condition_rating,
              weather_wind, weather_wind_speed_units, meeting_date, venue_country_id,
              venue_country_name, venue_country_iso2, venue_country_iso3,
              track_condition_overall, track_condition_rating, created_date, last_updated
            ) VALUES (
              @meeting_id, @meeting_name, @meeting_slug, @meeting_category, @meeting_type, @meeting_stage,
              @meeting_date_utc, @meeting_date_local, @rail_position, @region_id, @sport_id,
              @venue_id, @venue_name, @venue_slug, @venue_sport_id, @venue_state, @venue_address,
              @venue_track_map_url, @venue_straight, @venue_straight_unit, @venue_circumference,
              @venue_circumference_unit, @venue_weather_last_updated, @venue_is_clockwise,
              @country_id, @country_name, @country_iso2, @country_iso3, @weather_condition,
              @weather_condition_icon, @weather_feels_like, @weather_humidity, @weather_temperature,
              @weather_temperature_units, @weather_track_condition_overall, @weather_track_condition_rating,
              @weather_wind, @weather_wind_speed_units, @meeting_date, @venue_country_id,
              @venue_country_name, @venue_country_iso2, @venue_country_iso3,
              @track_condition_overall, @track_condition_rating, @created_date, @last_updated
            );
          `);
      }

      // ✅ Insert runners and exotic results
      const allRunnerRows = [];
      const allExoticRows = [];

      for (const meeting of meetings) {
        if (!Array.isArray(meeting.events)) continue;

        for (const event of meeting.events) {
          try {
            const fullEvent = await fetchEventDetails(event.id);
            const runners = flattenRunnersFromEvent(fullEvent, meeting.id, meeting.name, meeting.meetingDateLocal);
            allRunnerRows.push(...runners);

            if (fullEvent.isResulted && Array.isArray(fullEvent.exoticResult)) {
              for (const result of fullEvent.exoticResult) {
                allExoticRows.push({
                  exotic_id: result.id,
                  event_id: fullEvent.id,
                  meeting_id: meeting.id,
                  event_name: fullEvent.name,
                  event_number: fullEvent.eventNumber,
                  tote: result.tote,
                  exotic_market: result.exoticMarket,
                  results: result.results,
                  amount: parseFloat(result.amount),
                  created_date: new Date()
                });
              }
            }
          } catch (err) {
            console.error(`❌ Failed to fetch or flatten event ${event.id}`, err.message);
          }
        }
      }

      await insertRunners(pool, allRunnerRows);
      await insertExotics(pool, allExoticRows);

      console.log(`✅ Inserted ${flattened.length} meetings, ${allRunnerRows.length} runners, and ${allExoticRows.length} exotic results for ${date}.`);

    } catch (err) {
      console.error("❌ DB Insert error:", err);
    }
  }

  return {
    insertedCount: flattenedMeetings.length
  };
}

module.exports = {
  insertMeetingsToDbForDateRange
};
