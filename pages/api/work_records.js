import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
import { PAYMENT_STATUS, USER_ROLES } from '../../lib/constants';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';
import workers from '../../models/workers';
// Connect to MongoDB

// Create Work Record
export const createWorkRecord = async (req, res) => {
  await connectToDatabase();
  const { _id, company, role } = req.userData;
  const { section, item, worker, piece, item_rate, amount, worker_name, section_name, item_name } =
    req.body;

  try {
    // Get worker to find assignedManager
    const workerDoc = await workers.findById(worker);
    if (!workerDoc || workerDoc.company.toString() !== company.toString()) {
      return res.status(400).json({ error: 'Invalid worker' });
    }
    
    // If manager, ensure they can only create records for their assigned workers
    if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
      if (workerDoc.assignedManager.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'Unauthorized: You can only create records for workers assigned to you' });
      }
    }
    
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
      assignedManager: workerDoc.assignedManager,
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
  const { _id, company, role } = req.userData;
  try {
    const { worker, payment_status, fromDate, toDate, limit, skip, sections, items, manager } = req.query;
    let query = { isDeleted: false, company };
    
    // If user is a manager (not admin or administrator), filter by assignedManager
    if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
      query.assignedManager = _id;
    } else if (manager) {
      // Admin can filter by manager
      query.assignedManager = manager;
    }
    
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
      records = await WorkRecord.find(query).populate({path : 'worker', model : workers, select : ['name', 'lastname']}).populate('assignedManager', 'name').sort({ createdAt: -1 }).limit(limit).skip(skip);
    }else {
        records = await WorkRecord.find(query).populate({path : 'worker', model : workers, select : ['name', 'lastname']}).populate('assignedManager', 'name').sort({ createdAt: -1 });}
    res.status(200).json(records);
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
};

// Update Work Record
export const updateWorkRecord = async (req, res) => {
  await connectToDatabase();
  const { _id, company, role } = req.userData;
  const { id } = req.query; // Assuming the ID is passed as a query parameter

  try {
    const existingRecord = await WorkRecord.findById(id);
    if (!existingRecord || existingRecord.company.toString() !== company.toString()) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // If manager, ensure they can only update records for their assigned workers
    if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
      if (existingRecord.assignedManager.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'Unauthorized: You can only update records for workers assigned to you' });
      }
    }
    
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
  const { _id, company, role } = req.userData;
  const { id } = req.query; // Assuming the ID is passed as a query parameter

  try {
    const existingRecord = await WorkRecord.findById(id);
    if (!existingRecord || existingRecord.company.toString() !== company.toString()) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // If manager, ensure they can only delete records for their assigned workers
    if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
      if (existingRecord.assignedManager.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'Unauthorized: You can only delete records for workers assigned to you' });
      }
    }
    
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