import mongoose from 'mongoose';

const CreditPackSchema = new mongoose.Schema({
  packId: { type: String, required: true, unique: true }, // e.g. 'pack_100', 'pack_500'
  name: { type: String, required: true },
  credits: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  popular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.CreditPack || mongoose.model('CreditPack', CreditPackSchema);
