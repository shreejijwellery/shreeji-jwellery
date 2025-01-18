import mongoose from 'mongoose';

const EquipmentCapacitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: false },
  company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
}, {timestamps: true});

export default mongoose.models.EquipmentCapacity || mongoose.model('EquipmentCapacity', EquipmentCapacitySchema);
