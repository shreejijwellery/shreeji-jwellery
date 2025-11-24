import CompanyEmailMapping from '../../models/CompanyEmailMapping';
import { authMiddleware } from './common/common.services';

async function handler(req, res) {
  const { method } = req;

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (method === 'GET') {
      const mappings = await CompanyEmailMapping.find({ isDeleted: false })
        .sort({ companyName: 1 })
        .lean();
      return res.status(200).json({ success: true, mappings });
    }

    if (method === 'POST') {
      const { companyName, email } = req.body;

      if (!companyName || !email) {
        return res.status(400).json({ message: 'Company name and email are required' });
      }

      // Check if email already exists
      const existing = await CompanyEmailMapping.findOne({ 
        email: email.trim().toLowerCase(),
        isDeleted: false 
      });

      if (existing) {
        return res.status(400).json({ message: 'Email already mapped to a company' });
      }

      const mapping = new CompanyEmailMapping({
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
      });

      await mapping.save();
      return res.status(201).json({ success: true, mapping });
    }

    if (method === 'PUT') {
      const { id, companyName, email } = req.body;

      if (!id || !companyName || !email) {
        return res.status(400).json({ message: 'ID, company name and email are required' });
      }

      // Check if email already exists for another mapping
      const existing = await CompanyEmailMapping.findOne({ 
        email: email.trim().toLowerCase(),
        isDeleted: false,
        _id: { $ne: id }
      });

      if (existing) {
        return res.status(400).json({ message: 'Email already mapped to another company' });
      }

      const mapping = await CompanyEmailMapping.findByIdAndUpdate(
        id,
        {
          companyName: companyName.trim(),
          email: email.trim().toLowerCase(),
        },
        { new: true }
      );

      if (!mapping) {
        return res.status(404).json({ message: 'Mapping not found' });
      }

      return res.status(200).json({ success: true, mapping });
    }

    if (method === 'DELETE') {
      const { id } = req.method === 'DELETE' && req.body ? req.body : req.query;

      if (!id) {
        return res.status(400).json({ message: 'ID is required' });
      }

      const mapping = await CompanyEmailMapping.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );

      if (!mapping) {
        return res.status(404).json({ message: 'Mapping not found' });
      }

      return res.status(200).json({ success: true, message: 'Mapping deleted successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error('Company email mapping error:', error);
    return res.status(500).json({ message: 'Error processing request', error: String(error) });
  }
}

export default authMiddleware(handler);

