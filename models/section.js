import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema({
  // Define columns for master file
  name: { type: String, required: true },
  value: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  user : {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
}, {timestamps: true});

export default mongoose.models.Section || mongoose.model('Section', SectionSchema);
