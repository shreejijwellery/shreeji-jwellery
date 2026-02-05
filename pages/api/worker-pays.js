import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
import { PAYMENT_STATUS, USER_ROLES } from '../../lib/constants';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';
import workers from '../../models/workers';
// Connect to MongoDB



// Get Work Records
export const getWorkRecords = async (req, res) => {
  await connectToDatabase();
  const { _id, company, role } = req.userData;
  try {
    const { worker, payment_status, fromDate, toDate, limit, skip, sections, items, manager } = req.query;
    let query = { isDeleted: false, company };
    
    // If user is a manager (not admin or administrator), filter by assignedManager
    if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
      query.assignedManager = new mongoose.Types.ObjectId(_id);
    } else if (manager) {
      // Admin can filter by manager
      query.assignedManager = new mongoose.Types.ObjectId(manager);
    }
    
    if (worker) query = { ...query, worker: new mongoose.Types.ObjectId(worker) };
    if (payment_status === PAYMENT_STATUS.PAID) query = { ...query, payment_status };
    if (payment_status === PAYMENT_STATUS.PENDING)
      query = { ...query, payment_status: { $ne: PAYMENT_STATUS.PAID } };
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
    if (sections) query.section = { $in: sections?.split(',').map(s => new mongoose.Types.ObjectId(s)) };
    if (items) query.item = { $in: items?.split(',').map(i => new mongoose.Types.ObjectId(i)) };
    let records = [];
    records = await WorkRecord.aggregate([
      { $match: query },
      {
        $project: {
          worker: 1,
          assignedManager: 1,
          amount: 1,
          payment_status: 1
        }
      },
      {
        $group: {
          _id: "$worker",
          assignedManager: { $first: "$assignedManager" },
          paidAmount: { $sum: { $cond: { if: { $eq: ["$payment_status", PAYMENT_STATUS.PAID] }, then: "$amount", else: 0 } } },
          pendingAmount: { $sum: { $cond: { if: { $ne: ["$payment_status", PAYMENT_STATUS.PAID] }, then: "$amount", else: 0 } } },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      {
        $unwind: '$worker'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedManager',
          foreignField: '_id',
          as: 'manager'
        }
      },
      {
        $unwind: {
          path: '$manager',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          worker: 1,
          assignedManager: 1,
          manager: { name: 1 },
          paidAmount: 1,
          pendingAmount: 1,
          totalAmount: 1
        }
      }
    ]);
    res.status(200).json(records);
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
};

// Update Work Record


// Export the API functions
const handler = async (req, res) => {
  switch (req.method) {
    
    case 'GET':
      return getWorkRecords(req, res);
   
    default:
      res.setHeader('Allow', [ 'GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);