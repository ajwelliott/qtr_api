// routes/index.js
const express = require('express');
const router = express.Router();

// Controllers
const puntersMeetingsController = require('../controllers/puntersMeetingsController');
console.log('✅ Loaded puntersMeetingsController methods:', Object.keys(puntersMeetingsController));
const meetingController = require('../controllers/meetingController'); // Your existing meetingController
console.log('✅ Loaded meetingController methods:', Object.keys(meetingController));
const runnerController = require('../controllers/runnerController');
console.log('✅ Loaded runnerController methods:', Object.keys(runnerController));
const scratchingController = require('../controllers/scratchingController');
console.log('✅ Loaded scratchingController methods:', Object.keys(scratchingController));
const formHistoryController = require('../controllers/formHistoryController');
console.log('✅ Loaded formHistoryController methods:', Object.keys(formHistoryController));
const resultsController = require('../controllers/resultsController');
console.log('✅ Loaded resultsController methods:', Object.keys(resultsController));
const puntersSectionalsController = require('../controllers/puntersSectionalsController');
console.log('✅ Loaded puntersSectionalsController methods:', Object.keys(puntersSectionalsController));
const raceController = require('../controllers/raceController');
console.log('✅ Loaded raceController methods:', Object.keys(raceController));
const conditionsController = require('../controllers/conditionsController');
console.log('✅ Loaded conditionsController methods:', Object.keys(conditionsController));

// >>> ADD THIS NEW CONTROLLER IMPORT <<<
const generalDbController = require('../controllers/generalDbController');
console.log('✅ Loaded generalDbController methods:', Object.keys(generalDbController));


// ✅ Route definitions

// Conditions
router.get('/conditions', conditionsController.getConditions);

// Meetings
router.get('/meetings', meetingController.getMeetingsWithRaces);

// Scratchings
router.get('/scratchings', scratchingController.getAllScratchings);
router.get('/meetings/:id/scratchings', scratchingController.getMeetingScratchings);
router.get('/races/:raceId/scratchings', scratchingController.getRaceScratchings);

// Runners
router.get('/runners/:runnerId/profile', runnerController.getRunnerProfile);
router.get('/runners/:runnerId/history', formHistoryController.getFormHistoryByRunner);
router.get('/runners/search', runnerController.searchRunnersByName);
// If you want a general 'get all runners' endpoint, you could add this:
// router.get('/runners', runnerController.getAllRunners); // This would call the function from your runnerController

// Form History
router.get('/form-history/:runnerId', formHistoryController.getFormHistoryByRunner);
router.get('/form-history', formHistoryController.searchFormHistory);

// Results
router.get('/results', resultsController.getAllResults);
router.get('/results/race/:raceId', resultsController.getRaceResults);
router.get('/results/runner/:runnerId', resultsController.getRunnerResults);

// Race Details with Runners
router.get('/races/:raceId/runners', raceController.getRaceDetailsWithRunners);

// Punters sectionals information
router.get('/sectional-data/fetch', puntersSectionalsController.fetchAndProcessSectionalData);


// >>> ADD THE NEW GENERAL DATABASE API ROUTE <<<
// Example: GET /api/data/pf_meeting_list
// Example: GET /api/data/pf_races?lastUpdateColumn=lastUpdate&lastUpdateFrom=2023-01-01&lastUpdateTo=2023-01-31
// Example: GET /api/data/pf_field_list?getAll=true
// >>> IMPORTANT: Define the specific route FIRST <<<
router.get('/data/tables', generalDbController.getAvailableTables);
router.get('/data/:tableName', generalDbController.getDataFromTable);


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