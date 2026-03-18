const mongoose = require('mongoose');
const Match = require('./src/models/Match').default; // Adjust if needed

async function checkMatches() {
  try {
    // Connect to DB - adjust URI to your setup
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const liveStatuses = ['live', 'ongoing', 'in_progress'];
    const matches = await Match.find({ status: { $in: liveStatuses } });

    console.log(`\\n📊 Found ${matches.length} live/ongoing matches`);

    let invalidCount = 0;
    const invalidMatches = [];

    for (const match of matches) {
      const issues = [];

      // Check currentInnings
      if (!match.currentInnings || match.currentInnings < 1) {
        issues.push(`currentInnings invalid: ${match.currentInnings}`);
      }

      // Check innings array
      if (!match.innings || !Array.isArray(match.innings) || match.innings.length === 0) {
        issues.push('innings array empty/missing');
      } else {
        const currIdx = (match.currentInnings || 1) - 1;
        if (currIdx >= match.innings.length || currIdx < 0) {
          issues.push(`currentInningIdx ${currIdx} out of bounds (length: ${match.innings.length})`);
        }

        // Check current innings data
        const currInning = match.innings[currIdx];
        if (currInning) {
          if (isNaN(currInning.score) || currInning.score < 0) issues.push('score NaN/negative');
          if (isNaN(currInning.wickets) || currInning.wickets < 0) issues.push('wickets NaN/negative');
          if (isNaN(currInning.overs) || currInning.overs < 0) issues.push('overs NaN/negative');
          if (currInning.batsmen && currInning.batsmen.some(b => !b.name || b.name.trim() === '')) {
            issues.push('batsmen with empty names');
          }
        }
      }

      if (issues.length > 0) {
        invalidCount++;
        invalidMatches.push({ _id: match._id, name: match.name, issues });
        console.log(`❌ INVALID: ${match.name} (${match._id}): ${issues.join(', ')}`);
      }
    }

    console.log(`\\n📈 Summary: ${invalidCount}/${matches.length} matches invalid`);
    if (invalidMatches.length > 0) {
      console.log('\\n🔧 Fix these matches manually, then re-run.');
    } else {
      console.log('✅ All live matches have valid data - error likely elsewhere');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkMatches();

