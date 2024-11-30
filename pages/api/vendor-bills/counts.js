import mongoose from 'mongoose';
import VendorBill from '../../../models/VendorBills';
import connectToDatabase from '../../../lib/mongodb';
import moment from 'moment-timezone';
import { authMiddleware } from '../common/common.services';
const getCounts = async (req, res) => {
    try {
        const {vendorId, startDate, endDate, status, page, limit} = req.query;
        let criteria = {
            isDeleted: false
        };
        if (vendorId && mongoose.isValidObjectId(vendorId)) {
            criteria.vendorId = new mongoose.Types.ObjectId(vendorId);
        }
        if (startDate && endDate) {
            criteria.billDate = {
                $gte: new Date(moment(startDate).tz('IST').startOf('day').toISOString()),
                $lte: new Date(moment(endDate).tz('IST').endOf('day').toISOString()),
            };
        }else if (startDate) {
            criteria.billDate = {
                $gte:  new Date(moment(startDate).tz('IST').startOf('day').toISOString())
            };
        }else if (endDate) {
            criteria.billDate = {
                $lte: new Date(moment(endDate).tz('IST').endOf('day').toISOString())
            };
        }
        if (status) {
            criteria.status = status;
        }
        const options = {};
        if (page) {
            options.skip = (page - 1) * (limit || 20);
            options.limit = limit || 20;
    
        }
       const aggregation = VendorBill.aggregate([
            {
                $match: {...criteria}
            },
            {
                $group: {
                    _id: "$vendorId",
                    totalAmount: { $sum: "$amount" },
                    totalRemainAmount: { $sum: "$remainAmount" },
                    totalPaidAmount: { $sum: "$paidAmount" }
                }
            }
        ]);

        const result = await aggregation.exec();
        if (result.length > 0) {
            res.status(200).json({
                data: result
            });
        } else {
            res.status(200).json({
                totalAmount: 0,
                totalRemainAmount: 0,
                totalPaidAmount: 0
            });
        }
       
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
};
const handler = async (req, res) => {
    await connectToDatabase();

  switch (req.method) {
    case 'GET':
      await getCounts(req, res);
      break;

    default:
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}

export default authMiddleware(handler);