
import mongoose from 'mongoose';
import fs from 'fs';

let uri = '';
try {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  const match = envConfig.match(/MONGODB_URI=(.*)/);
  if (match) {
    uri = match[1].trim();
    if (uri.startsWith('"') && uri.endsWith('"')) {
      uri = uri.slice(1, -1);
    }
  }
} catch (e) {
  console.error('Could not read .env.local');
}

async function listCollections() {
  try {
    if (!uri) {
      console.error('MONGODB_URI not found');
      return;
    }
    console.log('Connecting to DB...');
    await mongoose.connect(uri);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:');
    collections.forEach(c => console.log(c.name));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listCollections();
