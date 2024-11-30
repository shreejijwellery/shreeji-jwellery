import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../lib/constants';

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
    payment_date: { type: Date },
    payment_status: { type: String, enum: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID] },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

export const WorkRecord = mongoose.models.WorkRecord || mongoose.model('WorkRecord', WorkRecordSchema);
