import mongoose from 'mongoose';
import {  VENDOR_BILL_TYPES, VENDOR_PAYMENT_MODES } from '../lib/constants';


const vendorBillSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    type : {
        type: String,
        enum: Object.keys(VENDOR_BILL_TYPES),
        required: true
    },
    partyName: {
        type: String,
        required: false
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId, // Assuming vendorId is an ObjectId
        required: true
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
    paymentMode: {
        type: String,
        enum: Object.keys(VENDOR_PAYMENT_MODES),
    },
    notes : {
        type: String
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId, // Assuming addedBy is an ObjectId
        required: true
    },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

}, { timestamps: true });

export default mongoose.models.VendorBill || mongoose.model('VendorBill', vendorBillSchema);
