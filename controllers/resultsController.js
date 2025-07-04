const { poolPromise } = require('../db/sql');

const getAllResults = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { meetingId, raceId } = req.query;

    let filters = [];
    if (meetingId) filters.push(`meetingId = '${meetingId}'`);
    if (raceId) filters.push(`raceId = '${raceId}'`);

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pool.request().query(`
      SELECT * FROM pf_results ${where} ORDER BY raceId ASC, position ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    res.status(500).send('Internal server error');
  }
};

const getRaceResults = async (req, res) => {
  try {
    const { raceId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT * FROM pf_results WHERE raceId = '${raceId}' ORDER BY position ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching race results:', error);
    res.status(500).send('Internal server error');
  }
};

const getRunnerResults = async (req, res) => {
  try {
    const { runnerId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT * FROM pf_results WHERE runnerId = '${runnerId}' ORDER BY meetingId DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching runner results:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getAllResults,
  getRaceResults,
  getRunnerResults
};
