import React from 'react';

const ConfirmationModal = ({ isOpen, title, message, onProceed, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
