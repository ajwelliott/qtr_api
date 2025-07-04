const express = require('express');
const router = express.Router();

// Controllers
const meetingController = require('../controllers/meetingController');
console.log('✅ Loaded meetingController methods:', Object.keys(meetingController));
const runnerController = require('../controllers/runnerController');
console.log('✅ Loaded runnerController methods:', Object.keys(runnerController));
const scratchingController = require('../controllers/scratchingController');
console.log('✅ Loaded scratchingController methods:', Object.keys(scratchingController));
const formHistoryController = require('../controllers/formHistoryController');
console.log('✅ Loaded formHistoryController methods:', Object.keys(formHistoryController));
const resultsController = require('../controllers/resultsController');
console.log('✅ Loaded resultsController methods:', Object.keys(resultsController));

// ✅ Route definitions

// Meetings
router.get('/meetings', meetingController.getMeetingsWithRaces);

// Scratchings
router.get('/scratchings', scratchingController.getAllScratchings);
router.get('/meetings/:id/scratchings', scratchingController.getMeetingScratchings);

// Runners
router.get('/runners/:runnerId/profile', runnerController.getRunnerProfile);
router.get('/runners/:runnerId/history', formHistoryController.getFormHistoryByRunner);
router.get('/runners/search', runnerController.searchRunnersByName);

// Form History
router.get('/form-history/:runnerId', formHistoryController.getFormHistoryByRunner);
router.get('/form-history', formHistoryController.searchFormHistory);

// Results
router.get('/results', resultsController.getAllResults);
router.get('/results/race/:raceId', resultsController.getRaceResults);
router.get('/results/runner/:runnerId', resultsController.getRunnerResults);

// 🔍 Debug route (optional)
router.get('/debug/:id', async (req, res) => {
  try {
    const { poolPromise } = require('../db/sql');
    const pool = await poolPromise;
    const id = parseInt(req.params.id);

    const [races, fields] = await Promise.all([
      pool.request().query(`SELECT * FROM pf_races WHERE meetingId = ${id}`),
      pool.request().query(`SELECT * FROM pf_field_list WHERE meetingId = ${id}`)
    ]);

    res.json({
      meetingId: id,
      races: races.recordset,
      fields: fields.recordset
    });
  } catch (err) {
    console.error('❌ Debug error:', err);
    res.status(500).send('Error retrieving debug data');
  }
});

module.exports = router;
