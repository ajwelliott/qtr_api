// controllers/linkRunnersController.js
const { poolPromise } = require('../db/sql');

const getAllLinkRunners = async (req, res) => {
  console.log('📥 Request: GET /api/link-runners');
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        LinkKey, meetingDate, MasterTrackName, raceNumber, tabNo, raceId, runnerId, raceId_runnerId
      FROM link_runners
      ORDER BY meetingDate DESC, MasterTrackName, raceNumber, tabNo;
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching link_runners:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getAllLinkRunners
};
