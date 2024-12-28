import mongoose from 'mongoose';
import { PLATTING_TYPES } from '../lib/constants';
const PlattingSchema = new mongoose.Schema({
    details: { type: String, required: false },
    type: { type: String, required: true, enum: Object.values(PLATTING_TYPES) },
    isDeleted: { type: Boolean, default: false },
    weight: { type: Number, required: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }, 
    }, { timestamps: true });

export const Platting = mongoose.models.Platting || mongoose.model('Platting', PlattingSchema);
