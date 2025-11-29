import mongoose from 'mongoose';

const SkuMappingSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  origin: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound unique index on SKU and companyId
// This ensures SKU is unique per company, not globally
SkuMappingSchema.index({ sku: 1, origin: 1, companyId: 1 }, { unique: true });

// Update the updatedAt field on save
SkuMappingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.SkuMapping || mongoose.model('SkuMapping', SkuMappingSchema);
