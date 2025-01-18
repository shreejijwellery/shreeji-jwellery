import mongoose from 'mongoose';

const EquipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  subSection: { type: mongoose.Schema.Types.ObjectId, ref: 'SubSection', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  capacity: { type: String, required: false },
  RTO: { type: String, required: false },
  manufacturer: { type: String, required: false },
  isDeleted: { type: Boolean, default: false },
  company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {timestamps: true});

export default mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);
