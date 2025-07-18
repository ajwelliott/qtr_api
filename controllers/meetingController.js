// controllers/meetingController.js

const { poolPromise, sql } = require('../db/sql');

// 📍 GET /api/meetings
async function getMeetingsWithRaces(req, res) {
    // ADD THIS LINE
    console.log('*** Meeting Controller - Version 2.1 Loaded and Executing ***');
    console.log('📥 Request: GET /api/meetings');
    try {
        const pool = await poolPromise;
        const {
            page = 1,
            pageSize = 50,
            track,
            date,
            dateFrom,
            dateTo,
            getAll // New parameter to bypass pagination and date filters
        } = req.query;

        let offset = (page - 1) * pageSize;
        const request = pool.request();
        const whereClauses = [];

        // 🧭 Filters
        // If 'getAll' is true, bypass date and pagination filters
        if (getAll !== 'true') { // Check for string 'true' as query parameters are strings
            if (date) {
                whereClauses.push(`CAST(m.meetingDate AS DATE) = @date`);
                request.input('date', sql.Date, date); // Add sql.Date for type safety
            }
            if (dateFrom) {
                whereClauses.push(`CAST(m.meetingDate AS DATE) >= @dateFrom`);
                request.input('dateFrom', sql.Date, dateFrom); // Add sql.Date for type safety
            }
            if (dateTo) {
                whereClauses.push(`CAST(m.meetingDate AS DATE) <= @dateTo`);
                request.input('dateTo', sql.Date, dateTo); // Add sql.Date for type safety
            }
        }

        if (track) {
            // Note: Assumes m.track_name is the correct field for filtering by track name
            whereClauses.push(`m.track_name LIKE @track`);
            request.input('track', sql.NVarChar, `%${track}%`); // Add sql.NVarChar for type safety
        }

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 🧠 Step 1: Paginated meeting info with all fields, now including conditions
        let meetingsQuery = `
            SELECT
                m.meetingId,
                m.track_name AS meetingName,
                m.meetingDate,
                m.trackId,
                m.location,
                m.state,
                m.country,
                m.railPosition,
                -- Get track conditions from pf_conditions table
                c.trackCondition,
                c.trackConditionNumber,
                c.rail AS trackRail, -- Rail position from pf_conditions
                c.weather,
                c.irrigation,
                c.rainfall,
                c.lastUpdate AS conditionsLastUpdate -- Last update from pf_conditions table
            FROM pf_meeting_list m
            LEFT JOIN pf_conditions c ON m.meetingId = c.meetingId -- LEFT JOIN to get conditions
            ${whereSQL}
            ORDER BY m.meetingDate DESC, m.meetingId DESC -- This is the crucial change for descending sort
        `;

        // Apply pagination only if 'getAll' is not true
        if (getAll !== 'true') {
            meetingsQuery += `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
        }

        console.log('📄 Executing meetings query:', meetingsQuery);
        const meetingsResult = await request.query(meetingsQuery);
        const meetings = meetingsResult.recordset;

        // ADD THIS LINE TO INSPECT THE RAW DATA (already included for debugging)
        console.log('Raw meetings data from DB:', JSON.stringify(meetings, null, 2));

        if (!meetings.length) {
            return res.json([]);
        }

        // 🎯 Step 2: Get all races for those meetingIds
        const meetingIds = meetings.map(m => m.meetingId);
        // Ensure meetingIdList is properly formatted for IN clause with string IDs
        const meetingIdList = meetingIds.length ? meetingIds.map(id => `'${id}'`).join(',') : "''";

        const racesQuery = `
            SELECT
                raceId,
                raceNumber,
                raceName,
                meetingId,
                raceDistance,
                raceAgeRestrictions,
                raceJockeyRestrictions,
                raceWeightType,
                raceLimitWeight,
                raceClass,
                racePrizeMoney,
                raceStartTime,
                raceStartTimeUTC,
                raceGroup,
                raceDescription,
                racePrizeMoneyBreakDown,
                raceSexRestrictions,
                meetingTabMeeting
            FROM pf_races
            WHERE meetingId IN (${meetingIdList})
            ORDER BY meetingId, raceNumber ASC
        `;

        console.log('📄 Fetching races for meetings:', meetingIds);
        const racesResult = await pool.request().query(racesQuery);
        const races = racesResult.recordset;

        // 🔗 Map races to meetings and include condition data
        const meetingsMap = {};
        meetings.forEach(m => {
            meetingsMap[m.meetingId] = {
                meetingId: parseInt(m.meetingId), // <--- PARSE AS INT HERE
                meetingName: m.meetingName,
                meetingDate: m.meetingDate,
                trackId: m.trackId,
                location: m.location,
                state: m.state,
                country: m.country,
                railPosition: m.railPosition,
                trackCondition: m.trackCondition,
                trackConditionNumber: m.trackConditionNumber,
                trackRail: m.trackRail,
                weather: m.weather,
                irrigation: m.irrigation,
                rainfall: m.rainfall,
                conditionsLastUpdate: m.conditionsLastUpdate,
                races: []
            };
        });

        const seenRaceIds = new Set(); // To prevent duplicate races if any database anomaly exists

        races.forEach(race => {
            const meeting = meetingsMap[race.meetingId];
            const uniqueKey = `${race.meetingId}-${race.raceId}`;
            if (meeting && !seenRaceIds.has(uniqueKey)) {
                meeting.races.push({
                    raceId: race.raceId,
                    raceNumber: race.raceNumber,
                    raceName: race.raceName,
                    meetingId: parseInt(race.meetingId), // <--- PARSE AS INT HERE
                    raceDistance: race.raceDistance,
                    raceAgeRestrictions: race.raceAgeRestrictions,
                    raceJockeyRestrictions: race.raceJockeyRestrictions,
                    raceWeightType: race.raceWeightType,
                    raceLimitWeight: race.raceLimitWeight,
                    raceClass: race.raceClass,
                    racePrizeMoney: race.racePrizeMoney,
                    raceStartTime: race.raceStartTime,
                    raceStartTimeUTC: race.raceStartTimeUTC,
                    raceGroup: race.raceGroup,
                    raceDescription: race.raceDescription,
                    racePrizeMoneyBreakDown: race.racePrizeMoneyBreakDown,
                    raceSexRestrictions: race.raceSexRestrictions,
                    meetingTabMeeting: race.meetingTabMeeting
                });
                seenRaceIds.add(uniqueKey);
            }
        });

        const finalMeetings = meetings.map(m => meetingsMap[m.meetingId]);
        res.json(finalMeetings);
    } catch (err) {
        console.error('❌ Error in getMeetingsWithRaces:', err);
        res.status(500).send('Internal server error');
    }
}

module.exports = {
    getMeetingsWithRaces
};