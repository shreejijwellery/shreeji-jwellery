import mongoose from 'mongoose';

const SubSectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  section : { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  isDeleted: { type: Boolean, default: false },
  company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {timestamps: true});

export default mongoose.models.SubSection || mongoose.model('SubSection', SubSectionSchema);
