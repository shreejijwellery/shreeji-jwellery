import mongoose from 'mongoose';

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  maxTotalUses: { type: Number, default: 0 }, // 0 = unlimited
  maxUsesPerCompany: { type: Number, default: 1 },
  packIds: { type: [String], default: [] }, // empty = all packs
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

PromoCodeSchema.index({ code: 1 });

export default mongoose.models.PromoCode || mongoose.model('PromoCode', PromoCodeSchema);
