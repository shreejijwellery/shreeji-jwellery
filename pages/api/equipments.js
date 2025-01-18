import connectToDatabase from '../../lib/mongodb';
import Equipment from '../../models/equipments';
import mongoose from 'mongoose';
import { authMiddleware } from './common/common.services';
const handler = async (req, res) => {
  const { method, query, userData } = req;

  await connectToDatabase();

  if (method === 'GET') {
    try {
        const {subSection, section} = query;
        const queryObj = {};
        if(subSection) queryObj.subSection = subSection;
        if(section) queryObj.section = section; 
      const equipments = await Equipment.find({ isDeleted: false, company: userData?.company, ...queryObj })
        .populate({ path: 'lastModifiedBy', select: 'name' })
        .populate({ path: 'subSection', select: 'name' })
        .populate({ path: 'section', select: 'name' })
        .lean();
      res.status(200).json({ equipments, message: 'Equipments fetched successfully!' });
    } catch (error) {
      res
        .status(500)
        .json({ error: error.message, message: 'Error fetching equipments from the database' }); // Added separate message key
    }
  }
  if (method === 'POST') {
    const { userData } = req;

    const body = req.body;
    const { name, type, subSection, section, capacity, RTO, manufacturer } = body;
    if (!name || !type || !subSection || !section) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const dataToSave = {
      name,
      type,
      subSection,
      section,
      lastModifiedBy: userData?._id,
      company: userData?.company,
    };
    if (capacity) dataToSave.capacity = capacity;
    if (RTO) dataToSave.RTO = RTO;
    if (manufacturer) dataToSave.manufacturer = manufacturer;
    const equipment = new Equipment(dataToSave);
    try {
      await equipment.save();
      res.status(200).json({ message: 'Equipment created successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error creating equipment' }); // Added separate message key
    }
  } else if (method === 'DELETE') {
    const body = req.body;
    const { id } = body;
    try {
      const result = await Equipment.updateOne({ _id: id }, { $set: { isDeleted: true } });

      res.status(200).json({ result, message: 'Equipment deleted successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error deleting equipment' }); // Added separate message key
    }
  } else if (method === 'PUT') {
    const body = req.body;

    const { _id, name, type, subSection, section, capacity, RTO, manufacturer } = body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (type) updateFields.type = type;
    if (subSection) updateFields.subSection = subSection;
    if (section) updateFields.section = section;
    if (capacity) updateFields.capacity = capacity;
    if (RTO) updateFields.RTO = RTO;
    if (manufacturer) updateFields.manufacturer = manufacturer;
    try {
      const result = await Equipment.updateOne(
        { _id: new mongoose.Types.ObjectId(_id) },
        { $set: updateFields }
      );
      res.status(200).json({ result, message: 'Equipment updated successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error updating equipment' }); // Added separate message key
    }
  }
  {
    // res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default authMiddleware(handler);
