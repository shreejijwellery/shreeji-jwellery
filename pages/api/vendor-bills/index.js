import mongoose from 'mongoose';
import VendorBill from '../../../models/VendorBills';
import connectToDatabase from '../../../lib/mongodb';

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
    const {vendorId, fromDate, toDate, status} = req.query;
    let criteria = {
        isDeleted: false
    };
    if (vendorId && mongoose.isValidObjectId(vendorId)) {
        criteria.vendorId = new mongoose.Types.ObjectId(vendorId);
    }
    if (fromDate && toDate) {
        criteria.billDate = {
            $gte: new Date(fromDate).toISOString(),
            $lte: new Date(toDate).toISOString()
        };
    }else if (fromDate) {
        criteria.billDate = {
            $gte: new Date(fromDate).toISOString()
        };
    }else if (toDate) {
        criteria.billDate = {
            $lte: new Date(toDate).toISOString()
        };
    }
    if (status) {
        criteria.status = status;
    }

    const vendorBills = await VendorBill.find(criteria);
    res.status(200).json(vendorBills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateVendorBill(req, res) {
  const { id } = req.query; // Assuming ID is passed in the query
  try {
    const updatedData = req.body;

    if (updatedData.billDate) {
        updatedData.billDate = new Date(updatedData.billDate).toISOString();
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
  const { id } = req.query; // Assuming ID is passed in the query
  try {
    const vendorBill = await VendorBill.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

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
