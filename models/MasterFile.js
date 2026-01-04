import mongoose from 'mongoose';

const MasterFileSchema = new mongoose.Schema({
  // Define columns for master file
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false // Optional for backward compatibility with existing records
  },
  user : {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
}, {timestamps: true});

// Index for efficient queries
MasterFileSchema.index({ company: 1 });
MasterFileSchema.index({ company: 1, sku: 1 });

export default mongoose.models.MasterFile || mongoose.model('MasterFile', MasterFileSchema);
