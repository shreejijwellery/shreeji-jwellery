import mongoose from 'mongoose';
import VendorBill from '../../../models/VendorBills';
import connectToDatabase from '../../../lib/mongodb';
import moment from 'moment-timezone';
import { VENDOR_BILL_STATUS } from '../../../lib/constants';
async function createVendorBill(req, res) {
  try {
    const { amount, partyName, vendorId, invoiceNo, billDate, addedBy }    = req.body;
    const billData = {
        amount,
        partyName,
        vendorId,
        invoiceNo,
        billDate : billDate ? new Date(billDate).toISOString() : new Date().toISOString(),
        addedBy,
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
    const {vendorId, startDate, endDate, status, page, limit} = req.query;
    let criteria = {
        isDeleted: false
    };
    if (vendorId && mongoose.isValidObjectId(vendorId)) {
        criteria.vendorId = new mongoose.Types.ObjectId(vendorId);
    }
    if (startDate && endDate) {
        criteria.billDate = {
            $gte: moment(startDate).tz('IST').startOf('day').toISOString(),
            $lte: moment(endDate).tz('IST').endOf('day').toISOString(),
        };
    }else if (startDate) {
        criteria.billDate = {
            $gte:  moment(startDate).tz('IST').startOf('day').toISOString()
        };
    }else if (endDate) {
        criteria.billDate = {
            $lte: moment(endDate).tz('IST').endOf('day').toISOString()
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

    const vendorBills = await VendorBill.find(criteria).sort({ billDate: -1 }).limit(options.limit).skip(options.skip);
    res.status(200).json(vendorBills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateVendorBill(req, res) {
  const id  = req.body._id; // Assuming ID is passed in the query
  try {
    const updatedData = req.body;
    delete updatedData._id;
    if (updatedData.billDate) {
        updatedData.billDate = new Date(updatedData.billDate).toISOString();
    }
    if(updatedData.amount){
        updatedData.remainAmount = updatedData.amount - (updatedData.paidAmount || 0);
    }

    if(updatedData.remainAmount === 0){
        updatedData.status = VENDOR_BILL_STATUS.PAID;
    }else if(updatedData.remainAmount > 0) {
        updatedData.status = VENDOR_BILL_STATUS.PARTIAL;
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
  try {
    const vendorBill = await VendorBill.findByIdAndUpdate(_id, { isDeleted: true }, { new: true });

    if (!vendorBill) {
      return res.status(404).json({ error: 'Vendor bill not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update the handler to call the new functions
export default async function handler(req, res) {
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
