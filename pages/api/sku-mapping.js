import connectToDatabase from '../../lib/mongodb.js';
import SkuMapping from '../../models/sku-mapping.js';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Set limit for large payloads
    },
  },
};

function findHeaderKeyInsensitive(row, target) {
  const keys = Object.keys(row || {});
  const match = keys.find(k => (k || '').trim().toLowerCase() === target.toLowerCase());
  return match;
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    await connectToDatabase();

    // Get user's company ID
    const User = (await import('../../models/users.js')).default;
    const user = await User.findById(decoded.userId).select('company');
    
    if (!user || !user.company) {
      return res.status(403).json({ success: false, message: 'User not associated with a company' });
    }

    const companyId = user.company;

    if (method === 'GET') {
      // Get all SKU mappings or search by SKU - filtered by company
      const { sku, search, limit = '5000' } = req.query;
      
      let query = { companyId }; // Always filter by company
      
      if (sku) {
        query.sku = sku;
      } else if (search) {
        query.$or = [
          { sku: { $regex: search, $options: 'i' } },
          { origin: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } }
        ];
      }

      // Cap limit at 10000 to prevent performance issues
      const maxLimit = Math.min(parseInt(limit), 10000);

      const mappings = await SkuMapping.find(query)
        .limit(maxLimit)
        .sort({ sku: 1 });
      
      return res.status(200).json({
        success: true,
        data: mappings,
        count: mappings.length
      });
    }

    if (method === 'POST') {
      // Handle direct JSON data submission (Client-side parsed)
      const { data } = req.body;

      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ success: false, message: 'No data provided or invalid format' });
      }

      const dataToProcess = data;
      let inserted = 0;
      let updated = 0;
      let errors = [];

      for (const row of dataToProcess) {
        // Find SKU column (case insensitive)
        const skuKey = findHeaderKeyInsensitive(row, 'SKU');
        const originKey = findHeaderKeyInsensitive(row, 'Origin');
        const companyKey = findHeaderKeyInsensitive(row, 'Company name') || findHeaderKeyInsensitive(row, 'Company');

        if (!skuKey || !originKey || !companyKey) {
          errors.push({ row, error: 'Missing required columns (SKU, Origin, Company name)' });
          continue;
        }

        const skuValue = String(row[skuKey] || '').trim();
        const originValue = String(row[originKey] || '').trim();
        const companyValue = String(row[companyKey] || '').trim();

        if (!skuValue || !originValue || !companyValue) {
          errors.push({ row, error: 'Empty values in required fields' });
          continue;
        }

        // Upsert (update if exists, insert if not) - scoped to company
        try {
          const result = await SkuMapping.findOneAndUpdate(
            { sku: skuValue, origin: originValue, companyId },
            {
              sku: skuValue,
              origin: originValue,
              companyName: companyValue,
              companyId,
              updatedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          // Check if it was an insert or update
          if (result.createdAt && result.updatedAt && Math.abs(result.createdAt - result.updatedAt) < 1000) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push({ sku: skuValue, error: error.message });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Processed ${dataToProcess.length} records`,
        inserted,
        updated,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    if (method === 'PUT') {
      // Manually parse body since bodyParser is disabled
      let body = req.body;
      if (!body) {
        try {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const data = Buffer.concat(buffers).toString();
          body = JSON.parse(data);
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid JSON body' });
        }
      }

      // Update a single SKU mapping - scoped to company
      const { id, sku, origin, companyName } = body;

      if (!sku || !origin || !companyName) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      let mapping;
      if (id) {
        // Update existing record by ID
        mapping = await SkuMapping.findOneAndUpdate(
          { _id: id, companyId },
          { sku, origin, companyName, updatedAt: new Date() },
          { new: true }
        );
        
        if (!mapping) {
          return res.status(404).json({ success: false, message: 'SKU mapping not found' });
        }
      } else {
        // Add new record or update if exact match (SKU + Origin) exists
        mapping = await SkuMapping.findOneAndUpdate(
          { sku, origin, companyId },
          { origin, companyName, updatedAt: new Date() },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      }

      return res.status(200).json({
        success: true,
        data: mapping
      });
    }

    if (method === 'DELETE') {
      // Delete SKU mapping(s) - scoped to company
      const { sku, skus } = req.query;

      if (skus) {
        // Delete multiple SKUs
        const skuArray = skus.split(',');
        const result = await SkuMapping.deleteMany({ sku: { $in: skuArray }, companyId });
        return res.status(200).json({
          success: true,
          message: `Deleted ${result.deletedCount} records`
        });
      } else if (sku) {
        // Delete single SKU
        const result = await SkuMapping.deleteOne({ sku, companyId });
        if (result.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'SKU not found' });
        }
        return res.status(200).json({
          success: true,
          message: 'SKU deleted successfully'
        });
      } else {
        return res.status(400).json({ success: false, message: 'No SKU provided' });
      }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}
