'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { IoIosAddCircleOutline } from 'react-icons/io';
import { FaEdit, FaSave } from 'react-icons/fa';
import { VENDOR_BILL_STATUS, VENDOR_BILL_TYPES } from '../lib/constants';

export default function AddBillModal(props) {
  const { isEditing, form, handleInputChange, handleSubmit, open, setOpen } = props;
  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
      {/* Overlay */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <DialogPanel className="relative mx-auto w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center bg-blue-600 px-4 py-3 text-white">
          {isEditing ? <FaEdit className='mr-2' /> : <IoIosAddCircleOutline className="mr-2 h-6 w-6" />}
            <DialogTitle as="h3" className="text-lg font-semibold">
            {isEditing ? 'Edit Bill' : 'Add New Bill'}
            </DialogTitle>
          </div>

          {/* Form */}
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                    {/* Vendor Name */}
                    <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="partyName">
                    Vendor Name
                  </label>
                  <input
                    id="partyName"
                    name="partyName"
                    type="text"
                    placeholder="Enter Vendor Name"
                    value={form.partyName}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="amount">
                    Amount 
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="Enter Amount"
                    value={form.amount}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

            

           {form.type !== VENDOR_BILL_TYPES.SUB && (
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="invoiceNo">
                    Invoice No
                  </label>
                  <input
                    id="invoiceNo"
                    name="invoiceNo"
                    type="text"
                    placeholder="Enter Invoice Number"
                    value={form.invoiceNo}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                )}

                {/* Bill Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="billDate">
                    {form.type !== VENDOR_BILL_TYPES.SUB ? 'Bill Date' : 'Payment Date'}
                  </label>
                  <input
                    id="billDate"
                    name="billDate"
                    type="date"
                    value={form.billDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Add any additional notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
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
                </button>
              </div>
            </form>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
