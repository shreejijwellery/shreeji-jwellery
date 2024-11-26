'use client';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import axios from 'axios';
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
export default function InlinePaymentHistory(props) {
  const { open, setOpen, billForPaymentHistory, setIsBillModified, payments } = props;
  const [paymentHistory, setPaymentHistory] = useState(payments);

  useEffect(() => {
    setPaymentHistory(payments);
  }, [payments]);

  console.log('payment hiostory', paymentHistory);
  return (
    <>
      {' '}
      <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'scroll' }}>
        <table className=" bg-white border border-b border-gray-200 rounded shadow-md">
         
          <tbody className="text-gray-600 text-sm font-light">
            {paymentHistory?.map(bill => (
              <tr key={bill._id} className=" hover:bg-gray-100">
                <td className="py-3 px-6 text-left">
                  {moment(bill.paymentDate).format('DD-MM-YYYY')}
                </td>
                <td className="py-3 px-6 text-left text-red-600 font-bold">Rs.{bill.amount}</td>
               
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
