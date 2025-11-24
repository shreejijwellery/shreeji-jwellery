import mongoose from 'mongoose';

const CompanyEmailMappingSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.CompanyEmailMapping || mongoose.model('CompanyEmailMapping', CompanyEmailMappingSchema);

