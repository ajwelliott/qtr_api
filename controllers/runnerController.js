const { poolPromise } = require('../db/sql');

const getRunnerProfile = async (req, res) => {
  try {
    let { runnerId } = req.params; // Use 'let' to reassign after parsing

    // Validate and parse runnerId to integer.
    // This ensures that non-numeric inputs for runnerId are caught early.
    runnerId = parseInt(runnerId);
    if (isNaN(runnerId)) {
        return res.status(400).json({ message: 'Runner ID must be a valid number.' });
    }

    const pool = await poolPromise;

    // Fetch data from multiple tables concurrently using Promise.all
    // Note: The original queries use string interpolation for runnerId.
    // For production, consider using parameterized queries for all inputs to prevent SQL injection.
    const [fieldResult, worksheetResult, ratingResult, formResult, scratchingsResult] = await Promise.all([
      pool.request().query(`SELECT * FROM pf_field_list WHERE runnerId = '${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_worksheets WHERE raceId_runnerId LIKE '%_${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_ratings WHERE raceId_runnerId LIKE '%_${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_form WHERE raceId_runnerId LIKE '%_${runnerId}'`),
      pool.request().query(`SELECT * FROM pf_scratchings WHERE runnerId = '${runnerId}'`)
    ]);

    // If no field list entry found, the runner does not exist
    if (!fieldResult.recordset.length) {
      return res.status(404).json({ message: 'Runner not found' });
    }

    const field = fieldResult.recordset[0];

    // Construct the response object, ensuring numeric IDs are parsed as integers
    res.json({
      runnerId: parseInt(field.runnerId), // Ensure runnerId is an integer in the response
      name: field.name,
      sex: field.sex,
      age: field.age,
      country: field.country,
      foalDate: field.foalDate,
      colours: field.colour,
      barrier: parseInt(field.barrier), // Parse barrier as integer
      tabNo: parseInt(field.tabNo), // Parse tabNo as integer
      handicapRating: field.handicapRating,
      last10: field.last10,
      trainer: {
        id: parseInt(field.trainer_trainerId), // Parse trainer ID as integer
        name: field.trainer_fullName,
        location: field.trainer_location
      },
      jockey: {
        id: parseInt(field.jockey_jockeyId), // Parse jockey ID as integer
        name: field.jockey_fullName,
        weight: field.jockey_ridingWeight,
        claim: field.jockey_claim,
        isApprentice: field.jockey_isApprentice
      },
      // Use nullish coalescing operator (??) to return null if recordset is empty
      worksheet: worksheetResult.recordset[0] ?? null,
      ratings: ratingResult.recordset[0] ?? null,
      // Map over arrays to ensure nested runnerIds are parsed as integers
      scratchings: scratchingsResult.recordset.map(s => ({
          ...s,
          runnerId: parseInt(s.runnerId)
      })),
      recentForm: formResult.recordset.map(f => ({
          ...f,
          runnerId: parseInt(f.runnerId)
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching runner profile:', error);
    res.status(500).send('Internal server error');
  }
};

const searchRunnersByName = async (req, res) => {
  try {
    const { name } = req.query;

    // Validate search query: name must exist and be at least 2 characters long
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

    // Map over results to ensure numeric IDs are parsed as integers
    const runners = result.recordset.map(runner => ({
        ...runner,
        runnerId: parseInt(runner.runnerId),
        meetingId: parseInt(runner.meetingId),
        raceId: parseInt(runner.raceId)
    }));

    res.json(runners); // Send the parsed runners
  } catch (error) {
    console.error('❌ Error searching runners by name:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  getRunnerProfile,
  // Assuming getRunnerFormHistory is correctly imported and doesn't need changes here
  getRunnerFormHistory: require('./formHistoryController').getRunnerFormHistory,
  searchRunnersByName
};
