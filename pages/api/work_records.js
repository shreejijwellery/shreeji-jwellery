import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
import { PAYMENT_STATUS } from '../../lib/constants';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';
// Connect to MongoDB

// Create Work Record
export const createWorkRecord = async (req, res) => {
  await connectToDatabase();
  const { _id, company } = req.userData;
  const { section, item, worker, piece, item_rate, amount, worker_name, section_name, item_name } =
    req.body;

  try {
    const newRecord = new WorkRecord({
      company,
      section,
      item,
      worker,
      piece,
      item_rate,
      amount,
      worker_name,
      section_name,
      item_name,
      lastModifiedBy: _id,
    });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get Work Records
export const getWorkRecords = async (req, res) => {
  await connectToDatabase();
  const { _id, company } = req.userData;
  try {
    const { worker, payment_status, fromDate, toDate, limit, skip, sections, items } = req.query;
    let query = { isDeleted: false, company };
    if (worker) query = { ...query, worker };
    if (payment_status === PAYMENT_STATUS.PAID) query = { ...query, payment_status };
    if (payment_status === PAYMENT_STATUS.PENDING)
      query = { ...query, payment_status: { $ne: PAYMENT_STATUS.PAID } };
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: moment(fromDate).tz('IST').startOf('day').toISOString(),
        $lte: moment(toDate).tz('IST').endOf('day').toISOString(),
      };
    } else if (fromDate) {
      query.createdAt = { $gte: moment(fromDate).tz('IST').startOf('day').toISOString() };
    } else if (toDate) {
      query.createdAt = { $lte: moment(toDate).tz('IST').endOf('day').toISOString() };
    }
    if (sections) query.section = { $in: sections?.split(',') };
    if (items) query.item = { $in: items?.split(',') };
    let records = [];
    if (limit && skip) {
      records = await WorkRecord.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip);
    }else {
        records = await WorkRecord.find(query).sort({ createdAt: -1 });}
    res.status(200).json(records);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update Work Record
export const updateWorkRecord = async (req, res) => {
  await connectToDatabase();
  const { _id, company } = req.userData;
  const { id } = req.query; // Assuming the ID is passed as a query parameter

  try {
    const updatedRecord = await WorkRecord.findByIdAndUpdate(id, { ...req.body, lastModifiedBy: _id }, { new: true });
    if (!updatedRecord) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Soft Delete Work Record
export const softDeleteWorkRecord = async (req, res) => {
  await connectToDatabase();
  const { _id, company } = req.userData;
  const { id } = req.query; // Assuming the ID is passed as a query parameter

  try {
    const deletedRecord = await WorkRecord.findByIdAndUpdate(
      id,
      { isDeleted: true, lastModifiedBy: _id },
      { new: true }
    );
    if (!deletedRecord) return res.status(404).json({ error: 'Record not found' });
    res.status(200).json(deletedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Export the API functions
const handler = async (req, res) => {
  switch (req.method) {
    case 'POST':
      return createWorkRecord(req, res);
    case 'GET':
      return getWorkRecords(req, res);
    case 'PUT':
      return updateWorkRecord(req, res);
    case 'DELETE':
      return softDeleteWorkRecord(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);