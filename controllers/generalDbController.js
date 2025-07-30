// controllers/generalDbController.js

const { poolPromise, sql } = require('../db/sql');

// IMPORTANT: Define a whitelist of tables that are allowed to be queried.
// This is CRUCIAL for security to prevent SQL injection and unauthorized data access.
const ALLOWED_TABLES = [
    'pf_meeting_list',
    'pf_races',
    'pf_field_list',
    'pf_worksheets',
    'pf_ratings', // Don't forget to add new tables here if you haven't!
    'pf_form',
    'pf_form_history',
    'pf_scratchings',
    'pf_conditions',
    'betfair_commission',
    'tracks',
    'link_runners',
    'punters_meetings',
    // Add any other tables you want to expose via this general API
];

// Optional: Define allowed columns for ordering or date filtering per table
const ALLOWED_COLUMNS_FOR_TABLE = {
    // Ensure you list the ACTUAL column name for each table's update timestamp
    'pf_meeting_list': ['meetingId', 'meetingDate', 'track_name', 'updated_at'], // Using 'updated_at' here
    'pf_races': ['raceId', 'meetingId', 'raceNumber', 'raceStartTime', 'updated_at'], // Example
    'pf_field_list': ['runnerId', 'name', 'meetingId', 'raceId', 'trainer_fullName', 'jockey_fullName', 'updated_at'], // Example
    'pf_worksheets': ['raceId_runnerId', 'last_updated'], // Example
    'pf_ratings': ['raceId_runnerId', 'last_updated'], // <-- This is the change for pf_ratings!
    'pf_form': ['raceId_runnerId', 'formId', 'last_updated'], // Example
    'pf_form_history' : ['runnerId', 'formId', 'updated_at'],
    'pf_scratchings': ['scratchingId', 'runnerId', 'updated_at'], // Example
    'pf_conditions': ['conditionId', 'meetingId', 'updated_at'], // Example
    'betfair_commission' : ['state', 'commission', 'state_name'],
    'tracks' : ['MasterTrackName', 'VariationTrackName'],
    'link_runners' : ['LinkKey', 'meetingDate', 'MasterTrackName', 'raceId', 'runnerId', 'raceId_runnerId'],
    'punters_meetings' : ['meeting_id', 'venue_id'],
};

/**
 * Fetches data from a specified table with optional filtering, pagination, and sorting.
 * Supports incremental refresh based on a date column.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getDataFromTable(req, res) {
    console.log('*** General DB Controller - Executing getDataFromTable ***');
    console.log(`📥 Request: GET /api/data/${req.params.tableName}`);

    try {
        const { tableName } = req.params;
        const {
            page = 1,
            pageSize = 1000, // Default pageSize for large fetches, adjust as needed
            orderByColumn,
            orderDirection = 'ASC', // Default sort direction
            lastUpdateColumn, // This parameter name remains consistent
            lastUpdateFrom,
            lastUpdateTo,
            getAll // Bypass pagination and date filters
        } = req.query;

        // 1. Validate table name against whitelist
        if (!ALLOWED_TABLES.includes(tableName)) {
            console.warn(`Attempted to access unauthorized table: ${tableName}`);
            return res.status(403).json({ error: `Access to table '${tableName}' is not allowed.` });
        }

        const pool = await poolPromise;
        const request = pool.request();
        const whereClauses = [];

        // 2. Handle Incremental Refresh (date range filter)
        if (lastUpdateColumn && lastUpdateFrom && lastUpdateTo) {
            // Validate that the specified lastUpdateColumn is actually allowed for this table
            if (ALLOWED_COLUMNS_FOR_TABLE[tableName] && !ALLOWED_COLUMNS_FOR_TABLE[tableName].includes(lastUpdateColumn)) {
                 console.warn(`Invalid lastUpdateColumn '${lastUpdateColumn}' for table '${tableName}'.`);
                 return res.status(400).json({ error: `Invalid lastUpdateColumn '${lastUpdateColumn}' for table '${tableName}'.` });
            }

            // Use the column name provided in the query parameter (e.g., 'updated_at' or 'last_updated')
            whereClauses.push(`CAST(${lastUpdateColumn} AS DATE) >= @lastUpdateFrom`);
            whereClauses.push(`CAST(${lastUpdateColumn} AS DATE) <= @lastUpdateTo`);
            request.input('lastUpdateFrom', sql.Date, lastUpdateFrom);
            request.input('lastUpdateTo', sql.Date, lastUpdateTo);
            console.log(`Applying incremental refresh filter: ${lastUpdateColumn} from ${lastUpdateFrom} to ${lastUpdateTo}`);
        } else if (lastUpdateColumn || lastUpdateFrom || lastUpdateTo) {
            return res.status(400).json({ error: "For incremental refresh, 'lastUpdateColumn', 'lastUpdateFrom', and 'lastUpdateTo' are all required." });
        }

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 3. Handle Ordering
        let orderBySQL = '';
        if (orderByColumn) {
            // Validate orderByColumn
            if (ALLOWED_COLUMNS_FOR_TABLE[tableName] && !ALLOWED_COLUMNS_FOR_TABLE[tableName].includes(orderByColumn)) {
                 console.warn(`Invalid orderByColumn '${orderByColumn}' for table '${tableName}'.`);
                 return res.status(400).json({ error: `Invalid orderByColumn '${orderByColumn}' for table '${tableName}'.` });
            }
            const direction = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            orderBySQL = `ORDER BY ${orderByColumn} ${direction}`;
            console.log(`Applying order by: ${orderByColumn} ${direction}`);
        } else {
            // --- NEW: More flexible default ordering for 'updated at' columns ---
            const commonUpdateColumnNames = ['updated_at', 'last_updated', 'lastUpdate', 'ModifiedDate']; // Add any other common names you use

            let foundDefaultOrderByColumn = null;

            // Iterate through common names to find one that's allowed for the current table
            for (const col of commonUpdateColumnNames) {
                if (ALLOWED_COLUMNS_FOR_TABLE[tableName] && ALLOWED_COLUMNS_FOR_TABLE[tableName].includes(col)) {
                    foundDefaultOrderByColumn = col;
                    break; // Found a suitable column, stop searching
                }
            }

            if (foundDefaultOrderByColumn) {
                // If a common update column is found and allowed, use it for default ordering (DESC)
                orderBySQL = `ORDER BY ${foundDefaultOrderByColumn} DESC`;
            }
            // Fallback to generic ID patterns if no suitable update column is found
            else if (ALLOWED_COLUMNS_FOR_TABLE[tableName] && ALLOWED_COLUMNS_FOR_TABLE[tableName].includes(`${tableName.replace('pf_', '')}Id`)) {
                 orderBySQL = `ORDER BY ${tableName.replace('pf_', '')}Id ASC`;
            }
            // You can add more specific ID checks here if generic patterns don't fit all tables
            else if (tableName === 'pf_meeting_list' && ALLOWED_COLUMNS_FOR_TABLE[tableName].includes('meetingId')) {
                orderBySQL = `ORDER BY meetingId ASC`;
            }
            else if (tableName === 'pf_field_list' && ALLOWED_COLUMNS_FOR_TABLE[tableName].includes('runnerId')) {
                 orderBySQL = `ORDER BY runnerId ASC`;
            }
            // Final fallback if no suitable ordering column is found
            else {
                orderBySQL = `ORDER BY (SELECT NULL)`;
            }
        }

        // 4. Construct the base query
        let query = `SELECT * FROM ${tableName} ${whereSQL} ${orderBySQL}`;

        // 5. Handle Pagination (unless 'getAll' is true)
        if (getAll !== 'true') {
            const offset = (parseInt(page) - 1) * parseInt(pageSize);
            request.input('offset', sql.Int, offset);
            request.input('pageSize', sql.Int, parseInt(pageSize));
            query += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
            console.log(`Applying pagination: page ${page}, pageSize ${pageSize}`);
        } else {
            console.log('Fetching all records (pagination bypassed).');
        }

        console.log('📄 Executing general query:', query);
        const result = await request.query(query);

        console.log(`Fetched ${result.recordset.length} records from ${tableName}.`);
        res.json(result.recordset);

    } catch (error) {
        console.error(`❌ Error fetching data from table ${req.params.tableName}:`, error);
        res.status(500).json({ error: 'Internal server error while fetching data.' });
    }
}

/**
 * Returns a list of tables that are available for querying via the general API.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function getAvailableTables(req, res) {
    console.log('*** General DB Controller - Executing getAvailableTables ***');
    console.log('📥 Request: GET /api/data/tables');

    try {
        // Return the list of allowed tables directly
        res.status(200).json(ALLOWED_TABLES);
    } catch (error) {
        console.error('❌ Error getting available tables:', error);
        res.status(500).json({ error: 'Internal server error while fetching available tables.' });
    }
}

module.exports = {
    getDataFromTable,
    getAvailableTables
};