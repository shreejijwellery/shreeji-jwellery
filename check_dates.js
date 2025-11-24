
import mongoose from 'mongoose';
import fs from 'fs';

// Read .env.local manually
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

const CancelledOrderSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  email: { type: String, required: false },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  uploadedDate: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

if (mongoose.models.CancelledOrder) {
  delete mongoose.models.CancelledOrder;
}

const CancelledOrder = mongoose.model('CancelledOrder', CancelledOrderSchema);

async function checkData() {
  try {
    if (!uri) {
      console.error('MONGODB_URI not found');
      return;
    }
    console.log('Connecting to DB...');
    await mongoose.connect(uri);
    
    const total = await CancelledOrder.countDocuments({});
    console.log(`Total records (including deleted): ${total}`);
    
    const recent = await CancelledOrder.find({})
      .sort({ uploadedDate: -1 })
      .limit(10)
      .lean();
      
    console.log('Recent 10 records:');
    recent.forEach(r => {
      console.log(`ID: ${r._id}, StartDate: ${r.startDate ? r.startDate.toISOString() : 'N/A'}, EndDate: ${r.endDate ? r.endDate.toISOString() : 'N/A'}, Deleted: ${r.isDeleted}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
