const { getMeetingsForDateRange } = require('../controllers/puntersMeetingsController');

async function main() {
  const args = process.argv.slice(2);
  let startOffset = 0;
  let endOffset = 0;

  if (args.length === 1) {
    startOffset = parseInt(args[0]);
    endOffset = startOffset;
  } else if (args.length === 2) {
    startOffset = parseInt(args[0]);
    endOffset = parseInt(args[1]);
  }

  if (isNaN(startOffset) || isNaN(endOffset)) {
    console.error('❌ Invalid input. Use: node fetchMeetingsByDateRange.js [startOffset] [endOffset]');
    return;
  }

  console.log(`⏱ Fetching meetings from today+${startOffset} to today+${endOffset}`);
  await getMeetingsForDateRange(startOffset, endOffset);
}

main();
