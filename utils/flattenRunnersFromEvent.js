// flattenRunnersFromEvent.js (updated with fixed class + new fields)
const dayjs = require('dayjs');

function safeDate(input) {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = function flattenRunnersFromEvent(event, meetingId, meetingName, meetingDateLocal) {
  const selections = event.selections || [];
  const rows = [];

  for (const selection of selections) {
    const competitor = selection.competitor || {};
    const stats = selection.stats || {};
    const prediction = selection.prediction || {};
    const trainer = selection.trainer || {};
    const jockey = selection.jockey || {};
    const flucs = selection.flucs || {};

    const formattedMeetingDate = meetingDateLocal ? dayjs(meetingDateLocal).format('D/MM/YYYY') : '';
    const compositeKey = `${formattedMeetingDate}-${meetingName}-${event.eventNumber}-${selection.competitorNumber}`;

    const [tp1 = 0, tp2 = 0, tp3 = 0] = stats.totalPlaces || [];
    const [ltp1 = 0, ltp2 = 0, ltp3 = 0] = stats.lastTenPlaces || [];
    const [ptj1 = 0, ptj2 = 0, ptj3 = 0] = stats.placesByTrainerJockey || [];

    rows.push({
      // ✅ Core composite + identifiers
      composite_key: compositeKey,
      meeting_id: meetingId,
      meeting_name: meetingName,
      meeting_date_local: meetingDateLocal ? dayjs(meetingDateLocal).add(1, 'day').toDate() : null,

      // ✅ Event-level fields
      event_id: event.id,
      event_number: event.eventNumber,
      event_name: event.name || null,
      event_slug: event.slug || null,
      event_class: event.eventClass || null,
      distance: event.distance || null,
      start_time: safeDate(event.startTime),
      event_end_time: safeDate(event.endTime),
      race_type: event.raceType || null,
      is_resulted: event.isResulted != null ? Boolean(event.isResulted) : null,
      track_condition_overall: event.trackCondition?.overall || null,
      track_condition_rating: event.trackCondition?.rating || null,
      surface: event.trackCondition.surface || null,
      race_prize_money: event.racePrizeMoney ?? null,
      result_state: event.resultState || null,
      starters: event.starters || null,
      place_winners: event.placeWinners || null,
      winning_time: event.winningTime || null,
      pace: event.pace || null,
      rail_position: event.railPosition || null,
      apprentice_can_claim: event.apprenticeCanClaim != null ? Boolean(event.apprenticeCanClaim) : null,

      selection_id: selection.id,
      competitor_number: selection.competitorNumber,
      barrier_number: selection.barrierNumber,
      barrier_row: selection.barrierRow,
      barrier_handicap: selection.barrierHandicap,
      is_emergency: selection.isEmergency,
      selection_result: selection.selectionResult,
      official_margin: selection.officialMargin,
      official_time: selection.officialTime,
      weight: selection.weight,
      weight_unit: selection.weightUnit,
      jockey_weight: selection.jockeyWeight,
      jockey_weight_claim: selection.jockeyWeightClaim,
      starting_price: selection.startingPrice,
      rating_official: selection.ratingOfficial,
      form_letters: selection.formLetters,
      status: selection.status,
      silk_image_url: selection.silkImageUrl,
      racing_colours: selection.racingColours,
      has_blinkers: selection.hasBlinkers,
      blinkers_first_time: selection.blinkersFirstTime,
      has_silk: selection.hasSilk,
      gear_changes: selection.gearChanges,
      comments: selection.comments,
      runner_comments: selection.selectionComments?.[0]?.comments || null,

      competitor_id: competitor.id,
      competitor_name: competitor.name,
      competitor_slug: competitor.slug,
      country_of_origin: competitor.country,
      sex: competitor.sex,
      age: competitor.age,
      colour: competitor.colour,
      sire_name: competitor.sire,
      dam_name: competitor.dam,

      trainer_name: trainer.name,
      jockey_name: jockey.name,

      barrier_speed_rating: prediction.barrierSpeedRating,
      settling_speed_rating: prediction.speedMeasureRatingName,
      closing_speed_rating: prediction.closingSpeedRating,

      flucs_high: flucs.high,
      flucs_low: flucs.low,
      flucs_open: flucs.open,

      average_prize_money: stats.averagePrizeMoney,
      total_prize_money: stats.totalPrizeMoney,
      total_runs: stats.totalRuns,
      win_percentage: stats.winPercentage,
      place_percentage: stats.placePercentage,
      last_ten_runs: stats.lastTenRuns,
      last_ten_places_1: ltp1,
      last_ten_places_2: ltp2,
      last_ten_places_3: ltp3,
      last_ten_figure: stats.lastTenFigure,
      rating: stats.rating,
      days_since_last_run: stats.daysSinceLastRun,
      last_run: stats.lastRun || null,
      last_win: stats.lastWin || null,
      last_run_finish_position: stats.lastRunFinishPosition,
      last_run_starting_price: stats.lastRunStartingPrice,
      runs_by_trainer_jockey: stats.runsByTrainerJockey,
      places_by_trainer_jockey_1: ptj1,
      places_by_trainer_jockey_2: ptj2,
      places_by_trainer_jockey_3: ptj3,
      trainer_jockey_win: stats.trainerJockeyWin,

      runs_by_distance: stats.runsByDistance,
      places_by_distance_1: (stats.placesByDistance || [])[0] ?? null,
      places_by_distance_2: (stats.placesByDistance || [])[1] ?? null,
      places_by_distance_3: (stats.placesByDistance || [])[2] ?? null,

      runs_by_track: stats.runsByTrack,
      places_by_track_1: (stats.placesByTrack || [])[0] ?? null,
      places_by_track_2: (stats.placesByTrack || [])[1] ?? null,
      places_by_track_3: (stats.placesByTrack || [])[2] ?? null,

      runs_by_dist_track: stats.runsByDistTrack,
      places_by_dist_track_1: (stats.placesByDistTrack || [])[0] ?? null,
      places_by_dist_track_2: (stats.placesByDistTrack || [])[1] ?? null,
      places_by_dist_track_3: (stats.placesByDistTrack || [])[2] ?? null,

      firm_runs: stats.firmRuns,
      firm_places_1: (stats.firmPlaces || [])[0] ?? null,
      firm_places_2: (stats.firmPlaces || [])[1] ?? null,
      firm_places_3: (stats.firmPlaces || [])[2] ?? null,

      good_runs: stats.goodRuns,
      good_places_1: (stats.goodPlaces || [])[0] ?? null,
      good_places_2: (stats.goodPlaces || [])[1] ?? null,
      good_places_3: (stats.goodPlaces || [])[2] ?? null,

      soft_runs: stats.softRuns,
      soft_places_1: (stats.softPlaces || [])[0] ?? null,
      soft_places_2: (stats.softPlaces || [])[1] ?? null,
      soft_places_3: (stats.softPlaces || [])[2] ?? null,

      heavy_runs: stats.heavyRuns,
      heavy_places_1: (stats.heavyPlaces || [])[0] ?? null,
      heavy_places_2: (stats.heavyPlaces || [])[1] ?? null,
      heavy_places_3: (stats.heavyPlaces || [])[2] ?? null,

      wet_runs: stats.wetRuns,
      wet_places_1: (stats.wetPlaces || [])[0] ?? null,
      wet_places_2: (stats.wetPlaces || [])[1] ?? null,
      wet_places_3: (stats.wetPlaces || [])[2] ?? null,

      dry_places_1: (stats.dryPlaces || [])[0] ?? null,
      dry_places_2: (stats.dryPlaces || [])[1] ?? null,
      dry_places_3: (stats.dryPlaces || [])[2] ?? null,

      group1_runs: stats.group1Runs,
      group1_places_1: (stats.group1Places || [])[0] ?? null,
      group1_places_2: (stats.group1Places || [])[1] ?? null,
      group1_places_3: (stats.group1Places || [])[2] ?? null,

      group2_runs: stats.group2Runs,
      group2_places_1: (stats.group2Places || [])[0] ?? null,
      group2_places_2: (stats.group2Places || [])[1] ?? null,
      group2_places_3: (stats.group2Places || [])[2] ?? null,

      group3_runs: stats.group3Runs,
      group3_places_1: (stats.group3Places || [])[0] ?? null,
      group3_places_2: (stats.group3Places || [])[1] ?? null,
      group3_places_3: (stats.group3Places || [])[2] ?? null,

      listed_race_runs: stats.listedRaceRuns,
      listed_race_places_1: (stats.listedRacePlaces || [])[0] ?? null,
      listed_race_places_2: (stats.listedRacePlaces || [])[1] ?? null,
      listed_race_places_3: (stats.listedRacePlaces || [])[2] ?? null,

      class_runs: stats.classRuns,
      class_places_1: (stats.classPlaces || [])[0] ?? null,
      class_places_2: (stats.classPlaces || [])[1] ?? null,
      class_places_3: (stats.classPlaces || [])[2] ?? null,

      fav_runs: stats.favRuns,
      fav_places_1: (stats.favPlaces || [])[0] ?? null,
      fav_places_2: (stats.favPlaces || [])[1] ?? null,
      fav_places_3: (stats.favPlaces || [])[2] ?? null,

      night_runs: stats.nightRuns,
      night_places_1: (stats.nightPlaces || [])[0] ?? null,
      night_places_2: (stats.nightPlaces || [])[1] ?? null,
      night_places_3: (stats.nightPlaces || [])[2] ?? null,

      clockwise_runs: stats.clockwiseRuns,
      clockwise_places_1: (stats.clockwisePlaces || [])[0] ?? null,
      clockwise_places_2: (stats.clockwisePlaces || [])[1] ?? null,
      clockwise_places_3: (stats.clockwisePlaces || [])[2] ?? null,

      anticlockwise_runs: stats.aClockwiseRuns,
      anticlockwise_places_1: (stats.aClockwisePlaces || [])[0] ?? null,
      anticlockwise_places_2: (stats.aClockwisePlaces || [])[1] ?? null,
      anticlockwise_places_3: (stats.aClockwisePlaces || [])[2] ?? null,

      synth_runs: stats.synthRun,
      synth_places_1: (stats.synthPlaces || [])[0] ?? null,
      synth_places_2: (stats.synthPlaces || [])[1] ?? null,
      synth_places_3: (stats.synthPlaces || [])[2] ?? null,

      dirt_runs: stats.dirtRuns,
      dry_places_1: (stats.dryPlaces || [])[0] ?? null,
      dry_places_2: (stats.dryPlaces || [])[1] ?? null,
      dry_places_3: (stats.dryPlaces || [])[2] ?? null,

      first_up_runs: stats.firstUpRuns,
      first_up_places_1: (stats.firstUpPlaces || [])[0] ?? null,
      first_up_places_2: (stats.firstUpPlaces || [])[1] ?? null,
      first_up_places_3: (stats.firstUpPlaces || [])[2] ?? null,

      second_up_runs: stats.secondUpStarts,
      second_up_places_1: (stats.secondUpPlaces || [])[0] ?? null,
      second_up_places_2: (stats.secondUpPlaces || [])[1] ?? null,
      second_up_places_3: (stats.secondUpPlaces || [])[2] ?? null,

      third_up_runs: stats.thirdUpStarts,
      third_up_places_1: (stats.thirdUpPlaces || [])[0] ?? null,
      third_up_places_2: (stats.thirdUpPlaces || [])[1] ?? null,
      third_up_places_3: (stats.thirdUpPlaces || [])[2] ?? null,

      roi: stats.roi
    });
  }

  return rows;
};
