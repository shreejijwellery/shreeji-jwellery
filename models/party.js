import mongoose from 'mongoose';

const WorkerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.models.Vendor || mongoose.model('Vendor', WorkerSchema);
