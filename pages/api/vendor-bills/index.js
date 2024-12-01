import mongoose from 'mongoose';
import VendorBill from '../../../models/VendorBills';
import connectToDatabase from '../../../lib/mongodb';
import moment from 'moment-timezone';
import { VENDOR_BILL_STATUS, VENDOR_BILL_TYPES } from '../../../lib/constants';
import { authMiddleware } from '../common/common.services';
async function createVendorBill(req, res) {
  try {
    const userId = req.userData?._id;
    const company = req.userData?.company;
    const { amount, partyName, vendorId, invoiceNo, billDate, addedBy, notes }    = req.body;
    const billData = {
        amount,
        partyName,
        type : VENDOR_BILL_TYPES.ADD,
        vendorId,
        invoiceNo,
        billDate : billDate ? new Date(billDate).toISOString() : new Date().toISOString(),
        lastModifiedBy: userId,
        company,
        remainAmount: amount,
    }
    const vendorBill = new VendorBill(billData);
    await vendorBill.save();
    res.status(201).json(vendorBill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getVendorBills(req, res) {
  try {
    const userId = req.userData?._id;
    const company = req.userData?.company;
    const {vendorId, startDate, endDate, status, page, limit} = req.query;
    let criteria = {
        isDeleted: false,
        company
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
            $gte:  new Date(moment(startDate).tz('IST').startOf('day').toISOString()  )
        };
    }else if (endDate) {
        criteria.billDate = {
            $lte: new Date(moment(endDate).tz('IST').endOf('day').toISOString())
        };
    }
    if (status === VENDOR_BILL_STATUS.PAID) {
        criteria.status = status;
    }
    if (status === VENDOR_BILL_STATUS.PARTIAL) {
        criteria.status = {$ne: VENDOR_BILL_STATUS.PAID};
    }
    if (status === VENDOR_BILL_STATUS.PENDING) {
        criteria.status = {$ne: VENDOR_BILL_STATUS.PAID};
    }
    const options = {};
    if (page) {
        options.skip = (Number(page||1) - 1) * (Number(limit) || 20);
        options.limit = Number(limit || 20);

    }
    const pipeline = [
        {
            $match: criteria
        },
        {
            $sort: {  createdAt: -1 }
        },
        {
            $skip: options?.skip || 0
        },
        {
            $limit: options?.limit || 20
        },
        {
            $lookup: {
                from: 'vendorpaymenthistories', // The name of the collection to join
                localField: '_id',  // Field from the VendorBill collection
                foreignField: 'invoiceId', // Field from the PaymentHistory collection
                as: 'paymentHistory' // The name of the array field to add to the documents
            }
        }
    ];

    const vendorBills = await VendorBill.aggregate(pipeline);
    res.status(200).json(vendorBills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateVendorBill(req, res) {
  const id  = req.body._id; // Assuming ID is passed in the query
  try {
    const userId = req.userData?._id;
    const company = req.userData?.company;
    const updatedData = req.body;
    updatedData.lastModifiedBy = userId;
    delete updatedData._id;
    if (updatedData.billDate) {
        updatedData.billDate = new Date(updatedData.billDate).toISOString();
    }
    if(updatedData.amount){
        updatedData.remainAmount = updatedData.amount - (updatedData.paidAmount || 0);
    }

    if(updatedData.remainAmount <= 0){
        updatedData.status = VENDOR_BILL_STATUS.PAID;
    }else if(updatedData.remainAmount < updatedData.amount) {
        updatedData.status = VENDOR_BILL_STATUS.PARTIAL;
    }else if(updatedData.paidAmount === 0){
        updatedData.status = VENDOR_BILL_STATUS.PENDING;
    }

    const vendorBill = await VendorBill.findByIdAndUpdate(id, updatedData, { new: true });
    if (!vendorBill) {
      return res.status(404).json({ error: 'Vendor bill not found' });
    }
    res.status(200).json(vendorBill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteVendorBill(req, res) {
  const { _id } = req.query; // Assuming ID is passed in the query
  const userId = req.userData?._id;
  try {
    const vendorBill = await VendorBill.findByIdAndUpdate(_id, { isDeleted: true, lastModifiedBy: userId }, { new: true });

    if (!vendorBill) {
      return res.status(404).json({ error: 'Vendor bill not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update the handler to call the new functions
const handler = async (req, res) => {
    await connectToDatabase();

  switch (req.method) {
    case 'POST':
      await createVendorBill(req, res);
      break;

    case 'GET':
      await getVendorBills(req, res);
      break;

    case 'PUT':
      await updateVendorBill(req, res);
      break;

    case 'DELETE':
      await deleteVendorBill(req, res);
      break;

    default:
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}

// Handle individual vendor bill operations

export default authMiddleware(handler);