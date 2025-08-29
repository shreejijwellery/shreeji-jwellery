import mongoose from 'mongoose';
import { Platting } from '../../../models/Platting'; // Adjust the import path as necessary
import connectToDatabase from '../../../lib/mongodb';
import moment from 'moment-timezone';
import { authMiddleware } from '../common/common.services';
// Connect to MongoDB

// Create Work Record


export const createFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  const { details, type, weight } =
    req.body;
  const userData = req.userData;
  const {_id, company} = userData;
  try {
    const newRecord = new Platting({
      details,
      type,
      weight,
      lastModifiedBy: _id,
      company
    });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get Work Records
export const getFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  try {
    const company = req.userData?.company;
    const {  fromDate, toDate, limit, skip, type } = req.query;
    let query = { isDeleted: false, company };
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
    if (type) query.type = type;
    let records = [];
    if (limit && skip) {
      records = await Platting.find(query).populate(
        {path:'lastModifiedBy', select:'name'}
      ).sort({ createdAt: -1 }).limit(limit).skip(skip);
    }else {
      records = await Platting.find(query).populate(
        {path:'lastModifiedBy', select:'name'}
      ).sort({ createdAt: -1 });}
    res.status(200).json({data:records,});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update Work Record
export const updateFinalProductRecord = async (req, res) => {
  await connectToDatabase();
  const { id } = req.query; // Assuming the ID is passed as a query parameter
  const company = req.userData?.company;
  const userId = req.userData?._id;
  try {
    const updatedRecord = await Platting.findByIdAndUpdate(id, { ...req.body, company, lastModifiedBy: userId }, { new: true });
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
  const userId = req.userData?._id;
  try {
        const deletedRecord = await Platting.findByIdAndUpdate(
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


export default authMiddleware(handler);
