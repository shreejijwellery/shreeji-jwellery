import connectToDatabase from '../../lib/mongodb';
import EquipmentCompany from '../../models/equipmentCompany';
import mongoose from 'mongoose';
import { authMiddleware } from './common/common.services';
const handler = async (req, res) => {
  const { method, query, userData } = req;

  await connectToDatabase();

  if (method === 'GET') {
    try {
        const queryObj = {};
        const equipmentCompanies = await EquipmentCompany.find({ isDeleted: false, company: userData?.company, ...queryObj })

        .lean();
      res.status(200).json({data : equipmentCompanies, message: 'Equipment Companies fetched successfully!' });
    } catch (error) {   
      res
        .status(500)
        .json({ error: error.message, message: 'Error fetching equipments from the database' }); // Added separate message key
    }
  }
  if (method === 'POST') {
    const { userData } = req;

    const body = req.body;
    const { name } = body;
    if (!name) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const dataToSave = {
      name,
      lastModifiedBy: userData?._id,
      company: userData?.company,
    };
    const equipmentCompany = new EquipmentCompany(dataToSave);
    try {
      await equipmentCompany.save();
      res.status(200).json({ message: 'Equipment Company created successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error creating equipment type' }); // Added separate message key
    }
  } else if (method === 'DELETE') {
    const body = req.body;
    const { id } = body;
    try {
      const result = await EquipmentCompany.updateOne({ _id: id }, { $set: { isDeleted: true } });

      res.status(200).json({ result, message: 'Equipment Company deleted successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error deleting equipment company' }); // Added separate message key
    }
  } else if (method === 'PUT') {
    const body = req.body;

    const { _id, name } = body;
    const updateFields = {};
    if (name) updateFields.name = name;
    try {
      const result = await EquipmentCompany.updateOne(
        { _id: new mongoose.Types.ObjectId(_id) },
        { $set: updateFields }
      );
      res.status(200).json({ result, message: 'Equipment Capacity updated successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error updating equipment capacity' }); // Added separate message key
    }
  }
  {
    // res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default authMiddleware(handler);
