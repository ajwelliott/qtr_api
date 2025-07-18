// controllers/raceController.js
const { poolPromise, sql } = require('../db/sql'); // Make sure 'sql' is also exported from db/sql.js if not already

const getRaceDetailsWithRunners = async (req, res) => {
    console.log('📥 Request: GET /api/races/:raceId/runners');
    try {
        const pool = await poolPromise;
        let { raceId } = req.params; // Use 'let' because we'll reassign after parsing

        // Parse raceId to integer and validate. This handles "null", "abc", etc., as invalid numbers.
        raceId = parseInt(raceId);
        if (isNaN(raceId)) {
            return res.status(400).json({ message: 'Race ID must be a valid number.' });
        }

        // Fetch race details, associated meeting details, AND track conditions
        const raceQuery = `
            SELECT
                r.raceId,
                r.raceNumber,
                r.raceName,
                r.raceDistance,
                r.raceStartTimeUTC, -- Get UTC time for consistency
                r.racePrizeMoney,
                r.raceClass,
                r.raceAgeRestrictions,
                r.raceSexRestrictions,
                r.raceWeightType,
                r.raceGroup,
                r.raceDescription,
                m.meetingId,
                m.track_name AS meetingName,
                m.state AS meetingState,
                m.meetingDate,
                m.railPosition, -- Keep original railPosition from meeting_list
                -- Get track conditions from pf_conditions table
                c.trackCondition,
                c.trackConditionNumber,
                c.rail AS trackRail, -- Rail position from pf_conditions
                c.weather,
                c.irrigation,
                c.rainfall,
                c.lastUpdate AS conditionsLastUpdate -- Last update from pf_conditions
            FROM pf_races r
            JOIN pf_meeting_list m ON r.meetingId = m.meetingId
            LEFT JOIN pf_conditions c ON m.meetingId = c.meetingId -- LEFT JOIN to get conditions
            WHERE r.raceId = @raceId;
        `;
        const raceResult = await pool.request()
            .input('raceId', sql.Int, raceId) // Use sql.Int for raceId
            .query(raceQuery);

        if (!raceResult.recordset.length) {
            return res.status(404).json({ message: 'Race not found' });
        }

        const raceDetails = raceResult.recordset[0];
        // Explicitly parse IDs as integers in the output, in case the database returns them as strings
        raceDetails.raceId = parseInt(raceDetails.raceId);
        raceDetails.meetingId = parseInt(raceDetails.meetingId);


        // Fetch all runners for this race
        const runnersQuery = `
            SELECT
                runnerId,
                tabNo,
                last10,
                name AS runnerName,
                trainer_fullName AS trainerName,
                jockey_fullName AS jockeyName,
                jockey_ridingWeight AS jockeyWeight,
                barrier
            FROM pf_field_list
            WHERE raceId = @raceId
            ORDER BY tabNo ASC;
        `;
        const runnersResult = await pool.request()
            .input('raceId', sql.Int, raceId) // Use sql.Int for raceId
            .query(runnersQuery);

        // Explicitly parse runnerId and tabNo as integers
        const runners = runnersResult.recordset.map(runner => ({
            ...runner,
            runnerId: parseInt(runner.runnerId),
            tabNo: parseInt(runner.tabNo)
        }));


        res.json({
            ...raceDetails,
            runners: runners
        });

    } catch (error) {
        console.error('❌ Error fetching race details with runners:', error);
        res.status(500).send('Internal server error');
    }
};

module.exports = {
    getRaceDetailsWithRunners
};