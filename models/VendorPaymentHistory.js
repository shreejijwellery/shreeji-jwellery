import mongoose from 'mongoose';
import VENDOR_PAYMENT_MODES from '../lib/constants';

const paymentHistorySchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Vendor' // Assuming you have a Vendor model
    },
    invoiceId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'VendorBill' // Assuming you have a VendorBill model
    },
    amount: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentMode: {
        type: String,
        enum: Object.keys(VENDOR_PAYMENT_MODES),
        required: true
    },
    notes : {
        type: String
    },
    isDeleted : {
        type: Boolean,
        default: false
    }
});

// Create the model
export default mongoose.models.VendorPaymentHistory || mongoose.model('VendorPaymentHistory', paymentHistorySchema);

