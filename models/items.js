import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  // Define columns for master file
  name: { type: String, required: true },
  rate: { type: Number, required: true },
  section : { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  isDeleted: { type: Boolean, default: false },
}, {timestamps: true});

export default mongoose.models.Item || mongoose.model('Item', ItemSchema);
