const { poolPromise } = require('../db/sql');

// 📍 GET /api/meetings
async function getMeetingsWithRaces(req, res) {
  console.log('📥 Request: GET /api/meetings');
  try {
    const pool = await poolPromise;
    const {
      page = 1,
      pageSize = 10,
      track,
      dateFrom,
      dateTo
    } = req.query;

    const offset = (page - 1) * pageSize;

    let whereClauses = [];
    if (track) whereClauses.push(`m.track_name LIKE '%${track}%'`);
    if (dateFrom) whereClauses.push(`m.meetingDate >= '${dateFrom}'`);
    if (dateTo) whereClauses.push(`m.meetingDate <= '${dateTo}'`);

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        m.meetingId, 
        m.track_name AS meetingName, 
        m.meetingDate,
        r.raceId, 
        r.raceNumber, 
        r.raceName
      FROM pf_meeting_list m
      LEFT JOIN pf_races r ON m.meetingId = r.meetingId
      ${whereSQL}
      ORDER BY m.meetingDate DESC, r.raceNumber ASC
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `;

    const result = await pool.request().query(query);
    const rows = result.recordset;

    // Organize races by meeting
    const meetingsMap = {};
    for (const row of rows) {
      const mId = row.meetingId;
      if (!meetingsMap[mId]) {
        meetingsMap[mId] = {
          meetingId: mId,
          meetingName: row.meetingName,
          meetingDate: row.meetingDate,
          races: []
        };
      }

      if (row.raceId) {
        meetingsMap[mId].races.push({
          raceId: row.raceId,
          raceNumber: row.raceNumber,
          raceName: row.raceName
        });
      }
    }

    const meetings = Object.values(meetingsMap);
    res.json(meetings);
  } catch (err) {
    console.error('❌ Error in getMeetingsWithRaces:', err);
    res.status(500).send('Internal server error');
  }
}

module.exports = {
  getMeetingsWithRaces
};
