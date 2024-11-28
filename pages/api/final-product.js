import mongoose from 'mongoose';
import { FinalProduct } from '../../models/FinalProduct'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
import moment from 'moment-timezone';
// Connect to MongoDB

// Create Work Record


export const createFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  const { section, item, piece, section_name, item_name } =
    req.body;

  try {
    const newRecord = new FinalProduct({
      section,
      item,
      piece,
      section_name,
      item_name,
    });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getItemWiseCounts = async (query) => {
  const itemWiseCounts = await FinalProduct.aggregate([
    { $match: query },
    { $group: { _id: "$item", totalPiece: { $sum: "$piece" } } }
  ]);
  return itemWiseCounts;
}
// Get Work Records
export const getFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  try {
    const {  fromDate, toDate, limit, skip, items, } = req.query;
    let query = { isDeleted: false };
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()),
        $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()),
      };
    } else if (fromDate) {
      query.createdAt = { $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()  ) };
    } else if (toDate) {
      query.createdAt = { $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()) };
    }
    const queryForItemWiseCounts = { ...query, isDeleted: false };
    const itemWiseCounts = await getItemWiseCounts(queryForItemWiseCounts);
    if (items) query.item = { $in: items?.split(',')?.map(id => new mongoose.Types.ObjectId(id)) };
    let records = [];
    if (limit && skip) {
      records = await FinalProduct.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip);
    }else {
      records = await FinalProduct.find(query).sort({ createdAt: -1 });}
    res.status(200).json({data:records, counts : itemWiseCounts});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update Work Record
export const updateFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  const { id } = req.query; // Assuming the ID is passed as a query parameter

  try {
    const updatedRecord = await FinalProduct.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedRecord) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Soft Delete Work Record
export const softDeleteFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  const { id } = req.query; // Assuming the ID is passed as a query parameter

  try {
    const deletedRecord = await FinalProduct.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!deletedRecord) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(deletedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Export the API functions
export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      return createFinalProductRecord(req, res);
    case 'GET':
      return getFinalProductRecord(req, res);
    case 'PUT':
      return updateFinalProductRecord(req, res);
    case 'DELETE':
      return softDeleteFinalProductRecord(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}



