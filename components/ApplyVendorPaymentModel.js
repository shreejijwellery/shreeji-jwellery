'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import moment from 'moment';
import { useState, useEffect } from 'react';
import { VENDOR_BILL_STATUS, VENDOR_PAYMENT_MODES } from '../lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import axios from 'axios';
export default function ApplyVendorPaymentModel(props) {
  const { open, setOpen, selectedParty, setIsBillModified, fetchVendorBills, user } = props;
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState(VENDOR_PAYMENT_MODES.CASH);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  


 

  const handleTotalAmountChange = value => {
    const enteredAmount = parseFloat(value);

    setTotalAmount(enteredAmount);

  };


  const handleSubmit = async () => {
    // Prepare data for submission
    const paymentData = {
      vendorId: selectedParty._id,
      partyName: selectedParty.name,
      paymentMode,
      paymentDate,
      notes,
      amount: totalAmount,
      addedBy: user._id // Total amount to be paid
    };

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
      fetchVendorBills(true);
      setIsBillModified(prev => [...prev, selectedParty._id]);
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
