import mongoose from 'mongoose';

/**
 * Global credit settings (single document). Admin can update.
 * - pagesPerCredit: e.g. 1 = 1 credit per page, 2 = 1 credit per 2 pages
 * - pricePerCredit: display price per credit (e.g. for UI)
 */
const CreditSettingsSchema = new mongoose.Schema({
  pagesPerCredit: { type: Number, default: 1, min: 0.1 },
  pricePerCredit: { type: Number, default: 1, min: 0 },
}, { timestamps: true });

export default mongoose.models.CreditSettings || mongoose.model('CreditSettings', CreditSettingsSchema);
