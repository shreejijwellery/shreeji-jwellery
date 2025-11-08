import mongoose from 'mongoose';

const CompanyOrderPreferenceSchema = new mongoose.Schema({
    company: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true,
        unique: true
    },
    customOrder: [{ 
        type: String 
    }],
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { 
    timestamps: true 
});

export default mongoose.models.CompanyOrderPreference || mongoose.model('CompanyOrderPreference', CompanyOrderPreferenceSchema);

