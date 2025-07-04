const { poolPromise } = require('../db/sql');

// 📍 GET /api/form-history/:runnerId
const getFormHistoryByRunner = async (req, res) => {
  try {
    const { runnerId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT *
      FROM pf_form_history
      WHERE runnerId = '${runnerId}'
      ORDER BY meetingDate DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching form history by runner:', error);
    res.status(500).send('Internal server error');
  }
};

// 📍 GET /api/form-history?name=...&dateFrom=...&dateTo=...
const searchFormHistory = async (req, res) => {
  try {
    const { name, dateFrom, dateTo } = req.query;
    const pool = await poolPromise;

    let query = `
      SELECT TOP 100 fh.*, fl.name
      FROM pf_form_history fh
      LEFT JOIN pf_field_list fl ON fh.runnerId = fl.runnerId
    `;

    const conditions = [];

    if (name) conditions.push(`fl.name LIKE '%${name}%'`);
    if (dateFrom) conditions.push(`fh.meetingDate >= '${dateFrom}'`);
    if (dateTo) conditions.push(`fh.meetingDate <= '${dateTo}'`);

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY fh.meetingDate DESC`;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error searching form history:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getFormHistoryByRunner,
  searchFormHistory
};
