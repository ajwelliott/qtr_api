// This script is for manual execution to fetch meetings and save to a JSON file.
// It is not intended to be run as an automated Jest test.

const { getMeetingsForDate, getFormattedDate } = require('./controllers/puntersMeetingsController');
const readline = require('readline');

async function run() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\nPlease select a date to fetch meetings for:");
    console.log("1: Today");
    console.log("2: Tomorrow");
    console.log("3: Other (enter a custom date)");
    console.log("Q: Quit Application");

    rl.question('Enter your choice: ', async (choice) => {
        let dateToFetch;
        if (choice === '1') {
            dateToFetch = getFormattedDate(new Date());
        } else if (choice === '2') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateToFetch = getFormattedDate(tomorrow);
        } else if (choice === '3') {
            dateToFetch = await new Promise(resolve => {
                rl.question('Please enter a date (YYYY-MM-DD): ', (customDate) => {
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (dateRegex.test(customDate)) {
                        resolve(customDate);
                    } else {
                        console.log("❌ Invalid date format. Please use YYYY-MM-DD.");
                        resolve(null); // Indicate invalid input
                    }
                });
            });
            if (!dateToFetch) {
                rl.close();
                return;
            }
        } else if (choice.toLowerCase() === 'q') {
            rl.close();
            return;
        } else {
            console.log("Invalid choice.");
            rl.close();
            return;
        }

        if (dateToFetch) {
            const meetings = await getMeetingsForDate(dateToFetch);
            if (meetings) {
                console.log(`\nFetched ${meetings.length} meetings for ${dateToFetch}. Check the generated JSON file.`);
            } else {
                console.log(`Failed to fetch meetings for ${dateToFetch}.`);
            }
        }
        rl.close();
    });
}

run();
