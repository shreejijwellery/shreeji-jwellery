import mongoose from 'mongoose';

const OfferSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 }, // e.g. 20 for 20%, or 50 for ₹50 off
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  packIds: { type: [String], default: [] }, // empty = applies to all packs
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
