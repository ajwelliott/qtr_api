// controllers/betfairCommissionController.js
const { poolPromise } = require('../db/sql');

const getAllCommissions = async (req, res) => {
  console.log('📥 Request: GET /api/betfair-commission');
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT state, commission, state_name
      FROM betfair_commission
      ORDER BY state ASC;
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching betfair commission:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getAllCommissions
};
