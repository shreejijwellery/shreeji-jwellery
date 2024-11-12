import mongoose from 'mongoose';

import connectToDatabase from '../../../lib/mongodb';
import VendorPaymentHistory from '../../../models/VendorPaymentHistory';
//Validations needed for vendorID, invoiceID, paymentDate



const createPayment = async (req, res) => {
  try {
    const { vendorId, invoiceId, amount, paymentMode, notes, paymentDate } = req.body;
    const data = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            invoiceId: new mongoose.Types.ObjectId(invoiceId),
            amount,
            paymentMode,
            notes,
            paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
          }
    
    const payment = new VendorPaymentHistory(data);
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getPayments = async (req, res) => {
    try {
        const criteria = {isDeleted : false}
        const {vendorId, invoiceId, paymentFromDate, paymentToDate} = req.query;
        if (vendorId && mongoose.isValidObjectId(vendorId)) {
            criteria.vendorId = new mongoose.Types.ObjectId(vendorId);
        }
        if (invoiceId && mongoose.isValidObjectId(invoiceId)) {
            criteria.invoiceId = new mongoose.Types.ObjectId(invoiceId);
        }
        if (paymentFromDate && paymentToDate) {
            criteria.paymentDate = {
                $gte: new Date(paymentFromDate).toISOString(),
                $lte: new Date(paymentToDate).toISOString()
            };
        }else if (paymentFromDate) {
            criteria.paymentDate = {
                $gte: new Date(paymentFromDate).toISOString()
            };
        }else if (paymentToDate) {
            criteria.paymentDate = {
                $lte: new Date(paymentToDate).toISOString()
            };
        }
        const payments = await VendorPaymentHistory.find(criteria);
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const deletePayment = async (req, res) => {
    const { id } = req.query;
    try {
        
        const payment = await VendorPaymentHistory.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.status(200).json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export default async function handler(req, res) {
    await connectToDatabase();

  switch (req.method) {
    case 'POST':
      await createPayment(req, res);
      break;

    case 'GET':
      await getPayments(req, res);
      break;

    case 'DELETE':
      await deletePayment(req, res);
      break;

    default:
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}