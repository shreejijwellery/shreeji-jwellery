import mongoose from 'mongoose';

import connectToDatabase from '../../../lib/mongodb';
import VendorPaymentHistory from '../../../models/VendorPaymentHistory';
import VendorBill from '../../../models/VendorBills';
import { VENDOR_BILL_STATUS,VENDOR_BILL_TYPES } from '../../../lib/constants';
import { authMiddleware } from '../common/common.services';
//Validations needed for vendorID, invoiceID, paymentDate

export async function appliedPayment(billId) {
  const appliedPayment = await VendorPaymentHistory.find({invoiceId: billId, isDeleted: false }).lean();
  let totalAppliedPayment = 0;
  appliedPayment.forEach(payment => {
    totalAppliedPayment += payment.amount;
  });
  const bill = await VendorBill.findById(billId).lean();
  if (!bill) {
    throw new Error('Bill not found');
  }
  const updatedBill = {   
    paidAmount: totalAppliedPayment,
    remainAmount: bill.amount - totalAppliedPayment
  }
  if((bill.amount - totalAppliedPayment) === 0 ){
    updatedBill.status = VENDOR_BILL_STATUS.PAID;
  }else if((bill.amount - totalAppliedPayment) > 0){
    updatedBill.status = VENDOR_BILL_STATUS.PARTIAL;
  }
  if(totalAppliedPayment === 0){
    updatedBill.status = VENDOR_BILL_STATUS.PENDING;
  }
  await VendorBill.findByIdAndUpdate(billId, updatedBill); 
  return updatedBill;
} 

const createPayment = async (req, res) => {
  try {
const userId = req.userData?._id;
const company = req.userData?.company;
    const { vendorId, paymentMode,amount, notes, paymentDate, addedBy, partyName } = req.body;
  const data = {
        vendorId: new mongoose.Types.ObjectId(vendorId),
        paymentMode,  
        partyName,
        notes,  
        billDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        amount,
        type: VENDOR_BILL_TYPES.SUB,
        lastModifiedBy: new mongoose.Types.ObjectId(addedBy),
        company
      }

      const payment = new VendorBill(data);
      await payment.save();


    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getPayments = async (req, res) => {
    try {
        const userId = req.userData?._id;
        const company = req.userData?.company;
        const criteria = {isDeleted : false, company}
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
    const userId = req.userData?._id;
    try {
        
        const payment = await VendorPaymentHistory.findByIdAndUpdate(id, { isDeleted: true, lastModifiedBy: userId }, { new: true });
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        await appliedPayment(payment.invoiceId);  
        res.status(200).json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const handler = async (req, res) => {
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

export default authMiddleware(handler);