const express = require('express');
const router = express.Router();

// ✅ Controller Imports
const puntersMeetingsController = require('../controllers/puntersMeetingsController');
const puntersMeetingsDBController = require('../controllers/puntersMeetingsDBController');
const meetingController = require('../controllers/meetingController');
const runnerController = require('../controllers/runnerController');
const scratchingController = require('../controllers/scratchingController');
const formHistoryController = require('../controllers/formHistoryController');
const resultsController = require('../controllers/resultsController');
const puntersSectionalsController = require('../controllers/puntersSectionalsController');
const raceController = require('../controllers/raceController');
const conditionsController = require('../controllers/conditionsController');
const tracksController = require('../controllers/tracksController');
const betfairCommissionController = require('../controllers/betfairCommissionController');
const linkRunnersController = require('../controllers/linkRunnersController');
const generalDbController = require('../controllers/generalDbController');
const puntersOddsController = require('../controllers/puntersOddsController'); // ✅ New controller

// ✅ API: Punters Meetings (new endpoint for Python insertion)
router.get('/api/punters-meetings', async (req, res) => {
  const startOffset = parseInt(req.query.startOffset || '0');
  const endOffset = parseInt(req.query.endOffset || startOffset);

  try {
    const results = await puntersMeetingsController.getMeetingsForDateRange(startOffset, endOffset);
    const allMeetings = results.flatMap(r => r.meetings);
    res.json(allMeetings);
  } catch (err) {
    console.error('❌ Failed to fetch punters meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings', details: err.message });
  }
});

// ✅ Route Definitions

// Conditions
router.get('/api/conditions', conditionsController.getConditions);

// Meetings
router.get('/api/meetings', meetingController.getMeetingsWithRaces);

// Scratchings
router.get('/api/scratchings', scratchingController.getAllScratchings);
router.get('/api/meetings/:id/scratchings', scratchingController.getMeetingScratchings);
router.get('/api/races/:raceId/scratchings', scratchingController.getRaceScratchings);

// Runners
router.get('/api/runners/:runnerId/profile', runnerController.getRunnerProfile);
router.get('/api/runners/:runnerId/history', formHistoryController.getFormHistoryByRunner);
router.get('/api/runners/search', runnerController.searchRunnersByName);

// Form History
router.get('/api/form-history/:runnerId', formHistoryController.getFormHistoryByRunner);
router.get('/api/form-history', formHistoryController.searchFormHistory);

// Results
router.get('/api/results', resultsController.getAllResults);
router.get('/api/results/race/:raceId', resultsController.getRaceResults);
router.get('/api/results/runner/:runnerId', resultsController.getRunnerResults);

// Race + Runners
router.get('/api/races/:raceId/runners', raceController.getRaceDetailsWithRunners);

// Sectionals
router.get('/api/sectional-data/fetch', puntersSectionalsController.fetchAndProcessSectionalData);

// Tracks
router.get('/api/tracks', tracksController.getAllTracks);

// Betfair Commission
router.get('/api/betfair-commission', betfairCommissionController.getAllCommissions);

// Linked Runners
router.get('/api/link-runners', linkRunnersController.getAllLinkRunners);

// Odds
router.get('/api/odds/event/:eventId', puntersOddsController.getOddsForEvent); // ✅ NEW

// Generic DB Data Access
router.get('/api/data/tables', generalDbController.getAvailableTables);
router.get('/api/data/:tableName', generalDbController.getDataFromTable);

// 🔍 Debug (Optional)
router.get('/api/debug/:id', async (req, res) => {
  try {
    const { poolPromise } = require('../db/sql');
    const pool = await poolPromise;
    const id = parseInt(req.params.id);

    const [races, fields] = await Promise.all([
      pool.request().query(`SELECT * FROM pf_races WHERE meetingId = ${id}`),
      pool.request().query(`SELECT * FROM pf_field_list WHERE meetingId = ${id}`)
    ]);

    res.json({ meetingId: id, races: races.recordset, fields: fields.recordset });
  } catch (err) {
    console.error('❌ Debug error:', err);
    res.status(500).send('Error retrieving debug data');
  }
});

router.post('/api/punters-meetings/insert', async (req, res) => {
  const { startOffset = 0, endOffset = 0 } = req.body;

  try {
    const result = await puntersMeetingsDBController.insertMeetingsToDbForDateRange(
      parseInt(startOffset),
      parseInt(endOffset)
    );
    res.json({ success: true, result });
  } catch (err) {
    console.error('❌ DB Insert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
