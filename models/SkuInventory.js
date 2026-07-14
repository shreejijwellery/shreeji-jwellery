import mongoose from 'mongoose';

const SkuInventorySchema = new mongoose.Schema({
    company: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true,
        index: true
    },
    companyName: { 
        type: String, 
        required: true,
        index: true
    },
    sku: { 
        type: String, 
        required: true,
        index: true
    },
    quantity: { 
        type: Number, 
        required: true,
        default: 0
    },
    selectedDate: { 
        type: Date, 
        required: true,
        index: true
    },
    platform: {
        type: String,
        index: true
    },
    uploadedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    uploadedByName: { 
        type: String, 
        required: true 
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true 
});

// Original compound indexes (untouched - for existing Meesho queries)
SkuInventorySchema.index({ company: 1, selectedDate: 1 });
SkuInventorySchema.index({ company: 1, companyName: 1, selectedDate: 1 });
SkuInventorySchema.index({ company: 1, isDeleted: 1, selectedDate: 1 });
SkuInventorySchema.index({ company: 1, isDeleted: 1, companyName: 1, sku: 1 });
SkuInventorySchema.index({ company: 1, isDeleted: 1, selectedDate: 1, companyName: 1, sku: 1 });
// Additional index for Flipkart platform-specific queries
SkuInventorySchema.index({ company: 1, platform: 1, isDeleted: 1, selectedDate: 1 });

export default mongoose.models.SkuInventory || mongoose.model('SkuInventory', SkuInventorySchema);

