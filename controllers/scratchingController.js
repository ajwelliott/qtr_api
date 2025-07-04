const { poolPromise } = require('../db/sql');

// Utility
const attachRunnerNames = async (scratchings) => {
  const pool = await poolPromise;
  const runnerIds = [...new Set(scratchings.map(s => s.runnerId))];
  const idList = runnerIds.map(id => `'${id}'`).join(',');

  const result = await pool.request().query(`
    SELECT runnerId, name AS runnerName
    FROM pf_field_list
    WHERE runnerId IN (${idList})
  `);

  const map = {};
  result.recordset.forEach(r => map[r.runnerId] = r.runnerName);

  return scratchings.map(s => ({
    ...s,
    runnerName: map[s.runnerId] || null
  }));
};

// Controllers
const getAllScratchings = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM pf_scratchings`);
    const enriched = await attachRunnerNames(result.recordset);
    res.json(enriched);
  } catch (error) {
    console.error('❌ Error fetching scratchings:', error);
    res.status(500).send('Internal server error');
  }
};

const getMeetingScratchings = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM pf_scratchings WHERE meetingId = '${req.params.id}'
    `);
    const enriched = await attachRunnerNames(result.recordset);
    res.json(enriched);
  } catch (error) {
    console.error('❌ Error fetching meeting scratchings:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getAllScratchings,
  getMeetingScratchings
};
