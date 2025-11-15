import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
    company: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true,
        index: true
    },
    date: { 
        type: Date, 
        required: true,
        index: true
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true 
});

// Compound index to ensure unique holidays per company per date
HolidaySchema.index({ company: 1, date: 1 }, { unique: true });

export default mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

