import mongoose from 'mongoose';

const CompanyEmailMappingSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false // Optional for backward compatibility with existing records
  },
  email: { type: String, required: true, unique: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Index for efficient queries
CompanyEmailMappingSchema.index({ company: 1 });
CompanyEmailMappingSchema.index({ company: 1, isDeleted: 1 });

export default mongoose.models.CompanyEmailMapping || mongoose.model('CompanyEmailMapping', CompanyEmailMappingSchema);

