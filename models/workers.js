import mongoose from 'mongoose';

const WorkerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    mobile_no: { type: String, required: true },
    address: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    bank_account_no: { type: String,  },
    bank_name: { type: String,  },
    bank_branch: { type: String,  },
    bank_ifsc: { type: String,  },
    bank_account_holder_name: { type: String,  },
}, { timestamps: true });

export default mongoose.models.Worker || mongoose.model('Worker', WorkerSchema);
