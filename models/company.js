import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
    companyName: { type: String, required: true }, 
    address: { type: String, required: false },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
