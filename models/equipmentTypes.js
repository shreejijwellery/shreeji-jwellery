import mongoose from 'mongoose';

const EquipmentTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
}, {timestamps: true});

export default mongoose.models.EquipmentType || mongoose.model('EquipmentType', EquipmentTypeSchema);
