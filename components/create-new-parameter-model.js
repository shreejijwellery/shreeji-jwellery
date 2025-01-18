'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { HTTP } from '../actions/actions_creators';
export default function CreateNewParameterModel(props) {
  const { open, fieldName, setOpen, submitFunction, editingItem } = props;
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmit = async () => {
    // Prepare data for submission
    const dataToSave = {
      name,
      type
    }
   console.log( fieldName, dataToSave);
   submitFunction(dataToSave);
  };
  
  useEffect(() => {
    if(editingItem) {
      setName(editingItem.name);
      setType(editingItem.type);
    }else{
      setName('');
      setType('');
    }
  }, [open]);

  

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
              Create New {fieldName}
            </DialogTitle>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-col space-y-4">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="border rounded p-2"
                placeholder="Name"
              />
              {/* <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="border rounded p-2">
                {Object.values(VENDOR_PAYMENT_MODES).map(mode => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))} */}
                {/* Add more payment modes as needed */}
              {/* </select> */}
             
            
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
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
