import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
    companyName: { type: String, required: true }, 
    address: { type: String, required: false },
    isDeleted: { type: Boolean, default: false },
    featureFlags: {
        // SKU Management Features
        isExtractSKU: { type: Boolean, default: false },
        isExcelFromPDF: { type: Boolean, default: false },
        isSKUInventory: { type: Boolean, default: false },
        isCancelledOrders: { type: Boolean, default: false },
        
        // Billing & Payment Features
        isPartyBills: { type: Boolean, default: false },
        isVendorBills: { type: Boolean, default: false },
        isWorkerBills: { type: Boolean, default: false },
        isVendorPayments: { type: Boolean, default: false },
        isWorkerPayments: { type: Boolean, default: false },
        
        // Production Management Features
        isProductionFlow: { type: Boolean, default: false },
        isFinalProduct: { type: Boolean, default: false },
        isInProcessProduct: { type: Boolean, default: false },
        isPlatting: { type: Boolean, default: false },
        
        // Master Data Management Features
        isSections: { type: Boolean, default: false },
        isItems: { type: Boolean, default: false },
        isWorkers: { type: Boolean, default: false },
        isVendors: { type: Boolean, default: false },
        
        // Additional Features
        isCalendar: { type: Boolean, default: false },
        isDashboard: { type: Boolean, default: true },
        isCompanyOrderPreference: { type: Boolean, default: false },
        isCompanyEmailMapping: { type: Boolean, default: false },
        isFileUpload: { type: Boolean, default: false },
        isMasterFileUpload: { type: Boolean, default: false },
        isOrderFileUpload: { type: Boolean, default: false },
    },
}, { timestamps: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
