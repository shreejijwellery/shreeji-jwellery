import mongoose from 'mongoose';
const FinalProductSchema = new mongoose.Schema({
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    piece: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
    section_name: { type: String, required: true }, 
    item_name: { type: String, required: true }, 
    }, { timestamps: true });

export const FinalProduct = mongoose.models.FinalProduct || mongoose.model('FinalProduct', FinalProductSchema);
