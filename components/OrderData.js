import { useState, useEffect } from 'react';
import { OrderKeys } from '../utils/constants';
import { MdDeleteForever } from 'react-icons/md';
import moment from 'moment-timezone';
import { useRouter } from 'next/router';

import axios from 'axios';
import { toast } from 'react-toastify';
import 'tailwindcss/tailwind.css';
export default function OrderData({ orderData, user, fetchGetOrderFiles}) {
    const [deleteRowData, setDeleteRowData] = useState(null);
    const [addNewPrice, setAddNewPrice] = useState({});

    const addPrice = async (price) => {
        const updateObj = {
          "STYLE ID": price.sku,
          "PRICE": price.price,
        };
        const payload = {
          user: {
            userId: user._id,
            name: user.name,
          },
          data: [updateObj]
        };
        const uploadUrl = '/api/uploadMasterFile';  
        const response = await axios.post(uploadUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.status === 200) {
          toast.success('Data uploaded successfully!');

          fetchGetOrderFiles();
          setAddNewPrice(null);
        }
      };
    const getValue = (row, key) => {
        if (key === 'uploadId') {
          return moment(row[key]).format('LLL');
        }
        return row[key];
      };
      const handlePrice = (row) => {
        setAddNewPrice(row);
      };
    const deleteRow = (row) => {
        setDeleteRowData(row);
        setIsModalOpen({
          isModalOpen: true,
          title: 'Delete Row',
          message: 'Are you sure you want to delete this row?',
          onProceed: () => confirmDeleteRow(row),
          onCancel: () => setIsModalOpen({ isModalOpen: false })
        });
      };

  const confirmDeleteRow = async (row) => {
    const body = {
      user: {
        userId: user._id,
        name: user.name,
      },
      sku: row.sku,
    };
    try {
      const response = await axios.post('/api/deleteUploadedData', body);
      if (response.status === 200) {
        toast.success('Data deleted successfully!');
        fetchGetOrderFiles();
        setIsModalOpen({ isModalOpen: false });
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Error deleting data. Please try again.');
      setIsModalOpen({ isModalOpen: false });
    }
  };
    return(
        <>
        {addNewPrice?.sku && (
        <div className="mt-4">
          <label htmlFor="price" className="block mb-2">
            Add Price for {addNewPrice.sku}
          </label>
          <div className="flex items-center space-x-4">
            <input
              id="price"
              type="number"
              value={addNewPrice.price}
              onChange={(e) => setAddNewPrice({ ...addNewPrice, price: Number(e.target.value) })}
              className="w-1/3 p-2 border border-gray-300 rounded"
            />
            <button
              onClick={() => addPrice(addNewPrice)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Price
            </button>
            <button
              onClick={() => setAddNewPrice(null)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
        {orderData.length > 0 && (
            <div className="mt-4 overflow-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr>
                    {Object.values(OrderKeys).map((key) => (
                      <th key={key} className="px-4 py-2 border-b bg-gray-200">
                        {key}
                      </th>
                    ))}
                    <th className="px-4 py-2 border-b bg-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.map((row, index) => (
                    <tr key={index}>
                      {Object.keys(row).map((key, i) => (
                        <td key={i} className="px-4 py-2 border-b">
                          {getValue(row, key)} {getValue(row, key) === 'Price not found' && <button onClick={() => handlePrice(row)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-red-600">Add Price</button>}
                        </td>
                      ))}
                      <td className="px-4 py-2 border-b">
                        <div onClick={() => deleteRow(row)} className="cursor-pointer text-red-600 hover:text-red-800">
                          <MdDeleteForever size={24} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          )}

        </>
    )
}