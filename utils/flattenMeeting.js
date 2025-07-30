// flattenMeeting.js
module.exports = function flattenMeeting(meeting) {
  const venue = meeting.venue || {};
  const country = meeting.country || {};
  const weather = meeting.weather || {};

  return {
    meeting_id: meeting.id,
    meeting_name: meeting.name || null,
    meeting_slug: meeting.slug || null,
    meeting_category: meeting.meetingCategory || null,
    meeting_type: meeting.meetingType || null,
    meeting_stage: meeting.meetingStage || null,
    meeting_date_utc: meeting.meetingDateUtc || null,
    meeting_date_local: meeting.meetingDateLocal || null,
    rail_position: meeting.railPosition || null,
    region_id: meeting.regionId || null,
    sport_id: meeting.sportId || null,

    venue_id: venue.id || null,
    venue_name: venue.name || null,
    venue_slug: venue.slug || null,
    venue_sport_id: venue.sportId || null,
    venue_state: venue.state || null,
    venue_address: venue.address || null,
    venue_track_map_url: venue.trackMapUrl || null,
    venue_straight: venue.straight ?? null,
    venue_straight_unit: venue.straightUnit || null,
    venue_circumference: venue.circumference ?? null,
    venue_circumference_unit: venue.circumferenceUnit || null,
    venue_weather_last_updated: venue.weatherLastUpdated || null,
    venue_is_clockwise: venue.isClockWise != null ? Boolean(venue.isClockWise) : null,

    country_id: venue.country.id || null,
    country_name: venue.country.name || null,
    country_iso2: venue.country.iso2 || null,
    country_iso3: venue.country.iso3 || null,

    weather_condition: weather.condition || null,
    weather_condition_icon: weather.conditionIcon || null,
    weather_feels_like: weather.feelsLike ?? null,
    weather_humidity: weather.humidity ?? null,
    weather_temperature: weather.temperature ?? null,
    weather_temperature_units: weather.temperatureUnits || null,
    weather_track_condition_overall: weather.trackConditionOverall || null,
    weather_track_condition_rating: weather.trackConditionRating || null,
    weather_wind: weather.wind || null,
    weather_wind_speed_units: weather.windSpeedUnits || null,

    // Extra for filtering
    meeting_date: meeting.meetingDateLocal || null,
    venue_country_id: venue.countryId || null,
    venue_country_name: venue.countryName || null,
    venue_country_iso2: venue.countryIso2 || null,
    venue_country_iso3: venue.countryIso3 || null,
    track_condition_overall: weather.trackConditionOverall || null,
    track_condition_rating: weather.trackConditionRating || null
  };
};
