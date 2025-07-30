// puntersMeetingsDBController.js

const sql = require('mssql');
const dayjs = require('dayjs');
const { getMeetingsForDate } = require('./puntersMeetingsController');
const flattenMeeting = require('../utils/flattenMeeting');

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

    console.log("🧾 Flattened meeting sample:");
    console.dir(flattened.slice(0, 2), { depth: null });

    try {
      const dbConfig = {
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        server: 'localhost',
        database: 'qtracing',
        options: {
          encrypt: false,
          trustServerCertificate: true,
          instanceName: 'qtserver'
        }
      };

      const pool = await sql.connect(dbConfig);

      for (const row of flattened) {
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
    } catch (err) {
      console.error("❌ DB Insert error:", err);
    }
  }

  return {
    insertedCount: flattenedMeetings.length,
    flattenedMeetings
  };
}

module.exports = {
  insertMeetingsToDbForDateRange
};
