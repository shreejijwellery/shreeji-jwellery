import mongoose from 'mongoose';

const MasterFileSchema = new mongoose.Schema({
  // Define columns for master file
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  user : {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
}, {timestamps: true});

export default mongoose.models.MasterFile || mongoose.model('MasterFile', MasterFileSchema);
