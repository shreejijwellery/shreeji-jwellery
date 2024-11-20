'use client';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import axios from 'axios';
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';

export default function VendorBillPaymentHistory(props) {
  const { open, setOpen, billForPaymentHistory } = props;
  console.log(billForPaymentHistory);
  const [paymentHistory, setPaymentHistory] = useState(null);

  const getPaymentHistory = async (billId) => {
    const response = await axios.get(`/api/vendor-bills/payment?invoiceId=${billId}`);
    setPaymentHistory(response.data);
  }
  useEffect(() => {
    if(billForPaymentHistory && open){
      getPaymentHistory(billForPaymentHistory);
    }else{
      setPaymentHistory([]);
    }   
  }, [billForPaymentHistory, open]);
  console.log("paymentHistory", paymentHistory);
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
              Applied Payment to {billForPaymentHistory?.invoiceNo ?? ''}
            </DialogTitle>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between"></div>
            <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'scroll' }}>
              <table className=" bg-white border border-gray-200 rounded shadow-md">
                <thead>
                  <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Payment Date</th>
                    <th className="py-3 px-6 text-left">Amount</th>
                    <th className="py-3 px-6 text-left">Payment Mode</th>
                    <th className="py-3 px-6 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {paymentHistory?.map(bill => (
                    <tr key={bill._id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left">
                        {moment(bill.paymentDate).format('DD-MM-YYYY')}
                      </td>
                      <td className="py-3 px-6 text-left">{bill.amount}</td>
                      <td className="py-3 px-6 text-left">{bill.paymentMode}</td>
                      <td className="py-3 px-6 text-left">{bill.notes}</td> 
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
              {/* <button
                  type="submit"
                  className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                  {isEditing ? (
                    <>
                      <FaSave className="mr-2" />
                      Update
                    </>
                  ) : (
                    <>
                      <IoIosAddCircleOutline className="mr-2" />
                      Add
                    </>
                  )}
                </button> */}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
