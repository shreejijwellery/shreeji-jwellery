import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records';
import connectToDatabase from '../../lib/mongodb';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';
import { PAYMENT_STATUS } from '../../lib/constants';

// Get Work Records Totals (without pagination)
export const getWorkRecordsTotals = async (req, res) => {
  await connectToDatabase();
  const { company } = req.userData;
  
  try {
    const { worker, payment_status, fromDate, toDate, sections, items } = req.query;
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
    
    if (sections) {
      query.section = { $in: sections.split(',').map(id => new mongoose.Types.ObjectId(id)) };
    }
    if (items) {
      query.item = { $in: items.split(',').map(id => new mongoose.Types.ObjectId(id)) };
    }

    // Aggregate to get totals
    const totals = await WorkRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPieces: { $sum: "$piece" },
          totalAmount: { $sum: "$amount" },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    const result = totals.length > 0 ? totals[0] : {
      totalPieces: 0,
      totalAmount: 0,
      totalRecords: 0
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Export the API handler
const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getWorkRecordsTotals(req, res);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default authMiddleware(handler);

