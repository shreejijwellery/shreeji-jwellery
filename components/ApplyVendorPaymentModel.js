'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import moment from 'moment';
import { useState, useEffect } from 'react';
import { VENDOR_BILL_STATUS, VENDOR_PAYMENT_MODES } from '../lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import axios from 'axios';
export default function ApplyVendorPaymentModel(props) {
  const { open, setOpen, selectedBills, selectedParty, isBillModified, setIsBillModified } = props;
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState(VENDOR_PAYMENT_MODES.CASH);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [payingBills, setPayingBills] = useState(selectedBills);
  const [billPayments, setBillPayments] = useState(
    selectedBills.map(bill => ({
      _id: bill._id,
      amount: bill.remainAmount, // Default to remain amount
    }))
  );

  const getBillsWithRemainAmount = async () => {
    const response = await axios.get(`/api/vendor-bills`, {
      params: {
        vendorId: selectedParty?._id || null,
        status: VENDOR_BILL_STATUS.PENDING,
      },
    });

    const newBills = response.data;
    const totalRemainAmount = newBills.reduce((sum, bill) => sum + bill.remainAmount, 0);
    setTotalAmount(totalRemainAmount);
    setPayingBills(newBills);
    setBillPayments(
      newBills.map(bill => ({
        _id: bill._id,
        paymentAmount: bill.remainAmount, // Default to remain amount
      }))
    );
  };
  useEffect(() => {
    if (selectedBills.length > 0) {
      setPayingBills(selectedBills);
      const totalRemainAmount = selectedBills.reduce((sum, bill) => sum + bill.remainAmount, 0);
      setTotalAmount(totalRemainAmount);
      setBillPayments(
        selectedBills.map(bill => ({
          _id: bill._id,
          paymentAmount: bill.remainAmount, // Default to remain amount
        }))
      );
    } else {
      getBillsWithRemainAmount();
    }
  }, [selectedBills]);

  const handleTotalAmountChange = value => {
    const enteredAmount = parseFloat(value);
    const totalRemainAmount = payingBills.reduce((sum, bill) => sum + bill.remainAmount, 0);
    if (enteredAmount > totalRemainAmount) {
      return;
    }
    if (enteredAmount < 0) {
      return;
    }
    setTotalAmount(enteredAmount);

    if (!isNaN(enteredAmount) && enteredAmount > 0) {
      const distributedPayments = distributeAmount(enteredAmount, payingBills);
      setBillPayments(distributedPayments);
    }
  };

  const distributeAmount = (amount, bills) => {
    // Sort bills by billDate (older bills first)
    const sortedBills = [...bills].sort((a, b) => new Date(a.billDate) - new Date(b.billDate));
    const totalRemainAmount = sortedBills.reduce((sum, bill) => sum + bill.remainAmount, 0);
    
    return sortedBills.map(bill => {
      // Pay the full amount of the bill if possible
      const paymentAmount = Math.min(bill.remainAmount, amount);
      amount -= paymentAmount; // Decrease the remaining amount to distribute
      return {
        ...bill,
        paymentAmount: paymentAmount,
      };
    });
  };

  const handlePaymentChange = (id, value) => {
    const enteredValue = parseFloat(value);
    setBillPayments(prev => {
      const updatedBills = prev.map(bill =>
        bill._id === id ? { ...bill, paymentAmount: enteredValue } : bill
      );
      const newTotalAmount = updatedBills.reduce((sum, bill) => sum + bill.paymentAmount, 0);
      setTotalAmount(newTotalAmount);
      return updatedBills;
    });
  };

  const handleSubmit = async () => {
    // Prepare data for submission
    const filteredBillPayments = billPayments.filter(payment => payment.paymentAmount !== 0);
    const paymentData = {
      vendorId: selectedParty._id,
      selectedBills: filteredBillPayments,
      paymentMode,
      paymentDate,
      notes,
      totalAmount: totalAmount, // Total amount to be paid
    };
    if (filteredBillPayments.length > 1) {
      paymentData.batchPaymentId = uuidv4();
    }

    // Call API to create payment
    const response = await fetch('/api/vendor-bills/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (response) {
      setOpen(false); // Close modal after submission
      setIsBillModified([...filteredBillPayments.map(bill => bill._id)]);
    } else {
      toast.error('Failed to apply payment');
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
      {/* Overlay */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center bg-blue-600 px-4 py-3 text-white">
            <DialogTitle as="h3" className="text-lg font-semibold">
              Apply Payment to {selectedParty?.name ?? ''}
            </DialogTitle>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-col space-y-4">
              <input
                type="number"
                value={totalAmount}
                onChange={e => handleTotalAmountChange(e.target.value)}
                className="border rounded p-2"
                placeholder="Total Amount"
              />
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                className="border rounded p-2">
                {Object.values(VENDOR_PAYMENT_MODES).map(mode => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
                {/* Add more payment modes as needed */}
              </select>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="border rounded p-2"
              />
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="border rounded p-2"
                placeholder="Notes"
              />
            </div>
            {/* Submit Button */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-200">
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSubmit}
                className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                {isLoading ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between"></div>
            <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'scroll' }}>
              <table className=" bg-white border border-gray-200 rounded shadow-md">
                <thead>
                  <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Invoice No</th>
                    <th className="py-3 px-6 text-left">Bill Date</th>
                    <th className="py-3 px-6 text-left">Amount</th>
                    <th className="py-3 px-6 text-left">Paid Amount</th>
                    <th className="py-3 px-6 text-left">Remain Amount</th>
                    <th className="py-3 px-6 text-left">Payment Amount</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {payingBills.map(bill => (
                    <tr key={bill._id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left">{bill.invoiceNo}</td>
                      <td className="py-3 px-6 text-left">
                        {moment(bill.billDate).format('DD-MM-YYYY')}
                      </td>
                      <td className="py-3 px-6 text-left">{bill.amount}</td>
                      <td className="py-3 px-6 text-left">{bill.paidAmount}</td>
                      <td className="py-3 px-6 text-left">{bill.remainAmount}</td>
                      <td>
                        <input
                          type="number"
                          value={billPayments.find(b => b._id === bill._id)?.paymentAmount || 0}
                          onChange={e =>
                            e.target.value > bill.remainAmount || e.target.value < 0
                              ? null
                              : handlePaymentChange(bill._id, e.target.value)
                          }
                          className="border rounded p-2"
                          placeholder="Amount"
                          max={bill.remainAmount}
                          // min={0}
                          
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Submit Button */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
