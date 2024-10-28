import mongoose from 'mongoose';

const WorkRecordSchema = new mongoose.Schema({
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    piece: { type: Number, required: true },
    item_rate: { type: Number, required: true }, 
    amount: { type: Number, required: true }, 
    isDeleted: { type: Boolean, default: false },
    worker_name: { type: String, required: true }, 
    section_name: { type: String, required: true }, 
    item_name: { type: String, required: true }, 
}, { timestamps: true });

export const WorkRecord = mongoose.models.WorkRecord || mongoose.model('WorkRecord', WorkRecordSchema);
