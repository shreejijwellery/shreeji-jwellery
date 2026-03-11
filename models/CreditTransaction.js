import mongoose from 'mongoose';

const CreditTransactionSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['trial', 'referral', 'purchase', 'consumption', 'admin_adjustment', 'referral_bonus'],
    required: true,
  },
  balanceAfter: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.CreditTransaction || mongoose.model('CreditTransaction', CreditTransactionSchema);
