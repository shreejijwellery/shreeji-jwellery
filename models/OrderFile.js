import { time } from 'console';
import mongoose from 'mongoose';

const OrderFileSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false // Optional for backward compatibility with existing records
  },
  user : {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
  uploadId: { type: Number, required: true, unique: true },
}, {timestamps: true});

// Index for efficient queries
OrderFileSchema.index({ company: 1 });
OrderFileSchema.index({ company: 1, uploadId: 1 });
OrderFileSchema.index({ company: 1, createdAt: 1 });

export default mongoose.models.OrderFile || mongoose.model('OrderFile', OrderFileSchema);
