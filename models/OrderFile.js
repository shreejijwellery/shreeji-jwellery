import { time } from 'console';
import mongoose from 'mongoose';

const OrderFileSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  user : {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
  uploadId: { type: Number, required: true, unique: true },
}, {timestamps: true});

export default mongoose.models.OrderFile || mongoose.model('OrderFile', OrderFileSchema);
