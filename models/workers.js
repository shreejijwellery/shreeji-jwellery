import mongoose from 'mongoose';

const WorkerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    mobile_no: { type: String, required: true },
    address: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

export default mongoose.models.Worker || mongoose.model('Worker', WorkerSchema);
