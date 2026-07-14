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
    platform: {
        type: String,
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

// Original compound index (untouched - for existing Meesho queries)
HolidaySchema.index({ company: 1, date: 1 }, { unique: true });
// Additional index for Flipkart platform-specific queries
HolidaySchema.index({ company: 1, date: 1, platform: 1 });

export default mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

