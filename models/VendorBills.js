import mongoose from 'mongoose';
import { VENDOR_BILL_STATUS } from '../lib/constants';


const vendorBillSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    partyName: {
        type: String,
        required: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId, // Assuming vendorId is an ObjectId
        required: true
    },
    remainAmount: {
        type: Number
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    billDate: {
        type: Date,
    },
    invoiceNo: {
        type: String,
        required: false
    },
    status : {
        type: String,
        enum: Object.keys(VENDOR_BILL_STATUS),
        default: VENDOR_BILL_STATUS.PENDING
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId, // Assuming addedBy is an ObjectId
        required: true
    },

}, { timestamps: true });

export default mongoose.models.VendorBill || mongoose.model('VendorBill', vendorBillSchema);
