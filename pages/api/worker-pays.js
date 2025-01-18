import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
import { PAYMENT_STATUS } from '../../lib/constants';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';
import workers from '../../models/workers';
// Connect to MongoDB



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
        $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()),
        $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()),
      };
    } else if (fromDate) {
      query.createdAt = { $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()) };
    } else if (toDate) {
      query.createdAt = { $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()) };
    }
    if (sections) query.section = { $in: sections?.split(',') };
    if (items) query.item = { $in: items?.split(',') };
    let records = [];
    records = await WorkRecord.aggregate([
      { $match: query },
      {
        $project: {
          worker: 1,
          amount: 1,
          payment_status: 1
        }
      },
      {
        $group: {
          _id: "$worker",
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
        $project: {
          worker: 1,
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