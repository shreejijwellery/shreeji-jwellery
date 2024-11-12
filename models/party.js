import mongoose from 'mongoose';

const WorkerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.models.Party || mongoose.model('Party', WorkerSchema);
