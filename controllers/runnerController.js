const { poolPromise } = require('../db/sql');

const getRunnerProfile = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { runnerId } = req.params;

    const [fieldResult, worksheetResult, ratingResult, formResult, scratchingsResult] = await Promise.all([
      pool.request().query(`SELECT * FROM pf_field_list WHERE runnerId = '${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_worksheets WHERE raceId_runnerId LIKE '%_${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_ratings WHERE raceId_runnerId LIKE '%_${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_form WHERE raceId_runnerId LIKE '%_${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_scratchings WHERE runnerId = '${runnerId}'`)
    ]);

    if (!fieldResult.recordset.length) {
      return res.status(404).json({ message: 'Runner not found' });
    }

    const field = fieldResult.recordset[0];

    res.json({
      runnerId,
      name: field.name,
      sex: field.sex,
      age: field.age,
      country: field.country,
      foalDate: field.foalDate,
      colours: field.colour,
      barrier: field.barrier,
      tabNo: field.tabNo,
      handicapRating: field.handicapRating,
      last10: field.last10,
      trainer: {
        id: field.trainer_trainerId,
        name: field.trainer_fullName,
        location: field.trainer_location
      },
      jockey: {
        id: field.jockey_jockeyId,
        name: field.jockey_fullName,
        weight: field.jockey_ridingWeight,
        claim: field.jockey_claim,
        isApprentice: field.jockey_isApprentice
      },
      worksheet: worksheetResult.recordset[0] ?? null,
      ratings: ratingResult.recordset[0] ?? null,
      scratchings: scratchingsResult.recordset,
      recentForm: formResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching runner profile:', error);
    res.status(500).send('Internal server error');
  }
};

const searchRunnersByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Provide at least 2 characters for runner name.' });
    }

    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 25 runnerId, name, age, sex, country,
        trainer_fullName AS trainerName,
        jockey_fullName AS jockeyName,
        meetingId, raceId
      FROM pf_field_list
      WHERE name LIKE '%${name}%'
      ORDER BY name ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error searching runners by name:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getRunnerProfile,
  getRunnerFormHistory: require('./formHistoryController').getRunnerFormHistory,
  searchRunnersByName
};
