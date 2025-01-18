import connectToDatabase from '../../lib/mongodb';
import EquipmentCapacity from '../../models/equipmentCapacity';
import mongoose from 'mongoose';
import { authMiddleware } from './common/common.services';
const handler = async (req, res) => {
  const { method, query, userData } = req;

  await connectToDatabase();

  if (method === 'GET') {
    try {
        const queryObj = {};
        const equipmentCapacities = await EquipmentCapacity.find({ isDeleted: false, company: userData?.company, ...queryObj })

        .lean();
      res.status(200).json({ data : equipmentCapacities, message: 'Equipment Capacities fetched successfully!' });
    } catch (error) {   
      res
        .status(500)
        .json({ error: error.message, message: 'Error fetching equipments from the database' }); // Added separate message key
    }
  }
  if (method === 'POST') {
    const { userData } = req;

    const body = req.body;
    const { name, type } = body;
    if (!name) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const dataToSave = {
      name,
      type,
      lastModifiedBy: userData?._id,
      company: userData?.company,
    };
    const equipmentCapacity = new EquipmentCapacity(dataToSave);
    try {
      await equipmentCapacity.save();
      res.status(200).json({ message: 'Equipment Capacity created successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error creating equipment type' }); // Added separate message key
    }
  } else if (method === 'DELETE') {
    const body = req.body;
    const { id } = body;
    try {
      const result = await EquipmentCapacity.updateOne({ _id: id }, { $set: { isDeleted: true } });

      res.status(200).json({ result, message: 'Equipment Capacity deleted successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error deleting equipment capacity' }); // Added separate message key
    }
  } else if (method === 'PUT') {
    const body = req.body;

    const { _id, name, type } = body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (type) updateFields.type = type;
    try {
      const result = await EquipmentCapacity.updateOne(
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
