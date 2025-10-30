import mongoose from 'mongoose';
import { InProcessProduct } from '../../models/InProcessProduct';
import connectToDatabase from '../../lib/mongodb';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';

// Create In-Process Product Record
export const createInProcessProductRecord = async (req, res) => {
  await connectToDatabase();
  const { section, item, piece, section_name, item_name } = req.body;
  const userData = req.userData;
  const { _id, company } = userData;
  try {
    const newRecord = new InProcessProduct({
      section,
      item,
      piece,
      section_name,
      item_name,
      lastModifiedBy: _id,
      company
    });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getItemWiseCounts = async (query) => {
  const itemWiseCounts = await InProcessProduct.aggregate([
    { $match: query },
    { $group: { _id: "$item", totalPiece: { $sum: "$piece" } } }
  ]);
  return itemWiseCounts;
}

// Get In-Process Product Records
export const getInProcessProductRecord = async (req, res) => {
  await connectToDatabase();
  try {
    const company = req.userData?.company;
    const { fromDate, toDate, limit, skip, items } = req.query;
    let query = { isDeleted: false, company };
    
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()),
        $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()),
      };
    } else if (fromDate) {
      query.createdAt = { $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()) };
    } else if (toDate) {
      query.createdAt = { $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()) };
    }
    
    const queryForItemWiseCounts = { ...query, isDeleted: false };
    const itemWiseCounts = await getItemWiseCounts(queryForItemWiseCounts);
    
    if (items) query.item = { $in: items?.split(',')?.map(id => new mongoose.Types.ObjectId(id)) };
    
    let records = [];
    if (limit && skip) {
      records = await InProcessProduct.find(query)
        .populate({ path: 'lastModifiedBy', select: 'name' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    } else {
      records = await InProcessProduct.find(query)
        .populate({ path: 'lastModifiedBy', select: 'name' })
        .sort({ createdAt: -1 });
    }
    
    res.status(200).json({ data: records, counts: itemWiseCounts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update In-Process Product Record
export const updateInProcessProductRecord = async (req, res) => {
  await connectToDatabase();
  const { id } = req.query;
  const company = req.userData?.company;
  const userId = req.userData?._id;
  try {
    const updatedRecord = await InProcessProduct.findByIdAndUpdate(
      id,
      { ...req.body, company, lastModifiedBy: userId },
      { new: true }
    );
    if (!updatedRecord) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Soft Delete In-Process Product Record
export const softDeleteInProcessProductRecord = async (req, res) => {
  await connectToDatabase();
  const { id } = req.query;
  const userId = req.userData?._id;
  try {
    const deletedRecord = await InProcessProduct.findByIdAndUpdate(
      id,
      { isDeleted: true, lastModifiedBy: userId },
      { new: true }
    );
    if (!deletedRecord) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(deletedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Export the API functions
async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      return createInProcessProductRecord(req, res);
    case 'GET':
      return getInProcessProductRecord(req, res);
    case 'PUT':
      return updateInProcessProductRecord(req, res);
    case 'DELETE':
      return softDeleteInProcessProductRecord(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);

