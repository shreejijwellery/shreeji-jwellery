import mongoose from 'mongoose';

const PromoUsageSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  promoCode: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', required: true },
  usedAt: { type: Date, default: Date.now },
  discountAmount: { type: Number, default: 0 },
  packId: { type: String },
  orderId: { type: String },
}, { timestamps: true });

PromoUsageSchema.index({ company: 1, promoCode: 1 });

export default mongoose.models.PromoUsage || mongoose.model('PromoUsage', PromoUsageSchema);
