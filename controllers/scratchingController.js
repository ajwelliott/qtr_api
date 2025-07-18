const { poolPromise, sql } = require('../db/sql');

// Utility function to attach runner names
const attachRunnerNames = async (scratchings) => {
    if (!scratchings || scratchings.length === 0) {
        return [];
    }

    const pool = await poolPromise;
    // Collect unique runner IDs, ensuring they are treated as strings for the SQL IN clause
    const runnerIds = [...new Set(scratchings.map(s => String(s.runnerId)))];
    if (runnerIds.length === 0) {
        return scratchings;
    }
    // Create a comma-separated list of quoted IDs for the IN clause
    const idList = runnerIds.map(id => `'${id}'`).join(',');

    try {
        const result = await pool.request().query(`
            SELECT runnerId, name AS runnerName
            FROM pf_field_list
            WHERE runnerId IN (${idList})
        `);

        const map = {};
        // Map runnerId to runnerName, ensuring runnerId is parsed as an integer for the map key
        result.recordset.forEach(r => map[parseInt(r.runnerId)] = r.runnerName);

        // Attach runnerName to each scratching, ensuring runnerId is an integer for lookup
        return scratchings.map(s => ({
            ...s,
            runnerName: map[parseInt(s.runnerId)] || null // Use parsed runnerId for lookup
        }));
    } catch (err) {
        console.error('SQL error in attachRunnerNames:', err);
        return scratchings.map(s => ({ ...s, runnerName: 'Error Loading Name' }));
    }
};

// Controllers
const getAllScratchings = async (req, res) => {
    console.log('📥 Request: GET /api/scratchings');
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                meetingId,
                raceId,
                runnerId,
                meetingDate,
                track,
                raceNo,
                tabNo,
                deduction,
                country,
                code,
                timeStamp,
                raceId_runnerId
            FROM pf_scratchings
        `);

        let scratchings = result.recordset;
        scratchings = await attachRunnerNames(scratchings);

        // Rename columns and parse IDs for frontend consistency
        const formattedScratchings = scratchings.map(s => ({
            meetingId: parseInt(s.meetingId),
            raceId: parseInt(s.raceId),
            runnerId: parseInt(s.runnerId),
            meetingDate: s.meetingDate,
            track: s.track,
            raceNumber: parseInt(s.raceNo), // Renamed and parsed
            runnerNumber: parseInt(s.tabNo), // Renamed and parsed
            deduction: s.deduction,
            country: s.country,
            code: s.code,
            timeStamp: s.timeStamp,
            raceId_runnerId: s.raceId_runnerId,
            runnerName: s.runnerName // Attached by utility function
        }));

        res.json(formattedScratchings);
    } catch (error) {
        console.error('❌ Error fetching all scratchings:', error);
        res.status(500).send('Internal server error');
    }
};

const getMeetingScratchings = async (req, res) => {
    console.log('📥 Request: GET /api/scratchings/meeting/:meetingId');
    try {
        const pool = await poolPromise;
        let { meetingId } = req.params; // Use 'let' to reassign

        // Validate and parse meetingId to integer
        meetingId = parseInt(meetingId);
        if (isNaN(meetingId)) {
            return res.status(400).json({ message: 'Meeting ID must be a valid number.' });
        }

        const result = await pool.request()
            .input('meetingId', sql.Int, meetingId) // Use parameterized query
            .query(`
                SELECT
                    meetingId,
                    raceId,
                    runnerId,
                    meetingDate,
                    track,
                    raceNo,
                    tabNo,
                    deduction,
                    country,
                    code,
                    timeStamp,
                    raceId_runnerId
                FROM pf_scratchings
                WHERE meetingId = @meetingId
            `);

        let scratchings = result.recordset;
        scratchings = await attachRunnerNames(scratchings);

        // Rename columns and parse IDs for frontend consistency
        const formattedScratchings = scratchings.map(s => ({
            meetingId: parseInt(s.meetingId),
            raceId: parseInt(s.raceId),
            runnerId: parseInt(s.runnerId),
            meetingDate: s.meetingDate,
            track: s.track,
            raceNumber: parseInt(s.raceNo),
            runnerNumber: parseInt(s.tabNo),
            deduction: s.deduction,
            country: s.country,
            code: s.code,
            timeStamp: s.timeStamp,
            raceId_runnerId: s.raceId_runnerId,
            runnerName: s.runnerName
        }));

        res.json(formattedScratchings);
    } catch (error) {
        console.error('❌ Error fetching meeting scratchings:', error);
        res.status(500).send('Internal server error');
    }
};

const getRaceScratchings = async (req, res) => {
    console.log('📥 Request: GET /api/scratchings/race/:raceId');
    try {
        const pool = await poolPromise;
        let { raceId } = req.params; // Use 'let' to reassign

        // Validate and parse raceId to integer
        raceId = parseInt(raceId);
        if (isNaN(raceId)) {
            return res.status(400).json({ message: 'Race ID must be a valid number.' });
        }

        const result = await pool.request()
            .input('raceId', sql.Int, raceId) // Use parameterized query
            .query(`
                SELECT
                    meetingId,
                    raceId,
                    runnerId,
                    meetingDate,
                    track,
                    raceNo,
                    tabNo,
                    deduction,
                    country,
                    code,
                    timeStamp,
                    raceId_runnerId
                FROM pf_scratchings
                WHERE raceId = @raceId
            `);

        let scratchings = result.recordset;
        scratchings = await attachRunnerNames(scratchings);

        // Rename columns and parse IDs for frontend consistency
        const formattedScratchings = scratchings.map(s => ({
            meetingId: parseInt(s.meetingId),
            raceId: parseInt(s.raceId),
            runnerId: parseInt(s.runnerId),
            meetingDate: s.meetingDate,
            track: s.track,
            raceNumber: parseInt(s.raceNo),
            runnerNumber: parseInt(s.tabNo),
            deduction: s.deduction,
            country: s.country,
            code: s.code,
            timeStamp: s.timeStamp,
            raceId_runnerId: s.raceId_runnerId,
            runnerName: s.runnerName
        }));

        res.json(formattedScratchings);
    } catch (error) {
        console.error('❌ Error fetching race scratchings:', error);
        res.status(500).send('Internal server error');
    }
};


module.exports = {
    getAllScratchings,
    getMeetingScratchings,
    getRaceScratchings
};
