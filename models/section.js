import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema({
  // Define columns for master file
  name: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {timestamps: true});

export default mongoose.models.Section || mongoose.model('Section', SectionSchema);
