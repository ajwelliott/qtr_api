// controllers/conditionsController.js
const { poolPromise } = require('../db/sql'); // Adjust path as necessary
const sql = require('mssql'); // Assuming you use mssql for database operations

// Helper for logging (if you have one, otherwise replace with console.log)
const log = (message) => console.log(message);

const conditionsController = {
    getConditions: async (req, res) => {
        log('📥 Request: GET /api/conditions'); // Log incoming request

        try {
            const pool = await poolPromise; // Get the database connection pool

            // Extract filters from query parameters
            const { meetingId, date, track, trackCondition } = req.query;

            let query = `SELECT * FROM pf_conditions WHERE 1=1`; // Base query

            // Add filters dynamically
            if (meetingId) {
                query += ` AND meetingId = @meetingId`;
            }
            if (date) {
                // FIX: Changed 'date' to 'meetingDate' as per your database schema/example response
                query += ` AND CAST(meetingDate AS DATE) = @date`; // Assuming meetingDate is stored as datetime and needs conversion
            }
            if (track) {
                // Using LIKE for partial match as per your test description
                query += ` AND track LIKE '%' + @track + '%'`;
            }
            if (trackCondition) {
                // Using LIKE for partial match as per your test description
                query += ` AND trackCondition LIKE '%' + @trackCondition + '%'`;
            }

            const request = pool.request();

            // Add parameters to prevent SQL injection and ensure correct type handling
            if (meetingId) {
                request.input('meetingId', sql.Int, meetingId);
            }
            if (date) {
                request.input('date', sql.Date, date); // @date parameter matches the query parameter name
            }
            if (track) {
                request.input('track', sql.NVarChar, track);
            }
            if (trackCondition) {
                request.input('trackCondition', sql.NVarChar, trackCondition);
            }

            const result = await request.query(query);

            if (result.recordset.length > 0) {
                log(`✅ Returning ${result.recordset.length} track condition(s)`);
                res.json(result.recordset);
            } else {
                log('⚠️ No conditions found for the provided filters.');
                res.status(404).json({ message: 'No conditions found matching your criteria.' });
            }
        } catch (err) {
            console.error('❌ Error fetching conditions:', err.message);
            res.status(500).json({
                message: 'Internal Server Error',
                error: err.message || 'An unexpected error occurred.'
            });
        }
    }
};

module.exports = conditionsController;