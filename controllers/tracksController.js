// controllers/tracksController.js
const { poolPromise } = require('../db/sql');

const getAllTracks = async (req, res) => {
  console.log('📥 Request: GET /api/tracks');
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT MasterTrackName, VariationTrackName
      FROM tracks
      ORDER BY MasterTrackName ASC, VariationTrackName ASC;
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching tracks:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getAllTracks
};
