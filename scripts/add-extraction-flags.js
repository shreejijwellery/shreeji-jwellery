/**
 * One-time script: set isMeeshoSort, isSnapdealSort, isAmazonSort to true for all companies.
 * Run from project root: node scripts/add-extraction-flags.js
 * Ensure MONGODB_URI is set (e.g. in .env.local or env).
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI or MONGO_URI in .env.local');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const result = await mongoose.connection.db.collection('companies').updateMany(
    {},
    {
      $set: {
        'featureFlags.isMeeshoSort': true,
        'featureFlags.isSnapdealSort': true,
        'featureFlags.isAmazonSort': true,
      },
    }
  );
  console.log('Updated companies:', result.modifiedCount, 'matched:', result.matchedCount);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
