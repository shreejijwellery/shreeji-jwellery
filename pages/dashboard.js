import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';
import FileDropzone from '../components/FileDropzone';
import * as xlsx from 'xlsx';

import ConfirmationModal from '../components/ConfirmationModal';
import { MdDeleteForever } from "react-icons/md";
import 'tailwindcss/tailwind.css';
import OrderData from '../components/OrderData';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [orderData, setOrderData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState({ isModalOpen: false });
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      axios
        .get('/api/validateToken', { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          setUser(response.data.user);
          fetchGetOrderFiles();
        })
        .catch(() => {
          router.push('/login');
        });
    }
  }, [router]);

  const handleFileUpload = (files) => {
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = xlsx.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      setTableData(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    const uploadUrl = fileType === 'order' ? '/api/uploadOrderFile' : '/api/uploadMasterFile';
    try {
      const payload = {
        user: {
          userId: user._id,
          name: user.name,
        },
        data: tableData,
      };
      const response = await axios.post(uploadUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        toast.success('Data uploaded successfully!');
        setFileType(null);
        setTableData([]);
        fetchGetOrderFiles();
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error('Error uploading data. Please try again.');
    }
  };

  const fetchGetOrderFiles = async () => {
    try {
      const response = await axios.get('/api/getOrderFiles');
      if (response.status === 200) {
        const result = response?.data?.data?.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          price: item.price || 'Price not found',
          finalPrice: (item.quantity || 0) + (item.price || 0),
          uploadedBy: item?.uploadedBy?.name,
          uploadId: item.uploadId
        }));
        setOrderData(result);
        if (result.length === 0) {
          toast.warn('No order files are uploaded today!');
        }
        if (result.length > 0)
          toast.success('Order files are already uploaded today!');
      }
    } catch (error) {
      console.error('Error fetching order files:', error);
      toast.error('Error fetching order files. Please try again.');
    }
  };

  const handleCancel = () => {
    setTableData([]);
    setFileType(null);
  };


  const handleConfimationModal = (data) => {
    setIsModalOpen({
      isModalOpen: true,
      title: 'Alert!',
      message: 'Are you sure you want to delete all data?',
      onProceed: () => deleteAllUploadedData(data),
      onCancel: () => setIsModalOpen({ isModalOpen: false })
    });

  };

  const deleteAllUploadedData = async (data) => {
    const body = {
      user: {
        userId: user._id,
        name: user.name,
      },
      uploadId: data[0].uploadId
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



  const clearTableData = () => {
    setTableData([]);
  };

  if (!user) {
    return <p>Loading...</p>;
  }



  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="mb-4">Welcome, {user.name}!</p>
      <div className="flex space-x-4 mb-4">
        {!fileType && (
          <>
            {!orderData?.length && (
              <button
                onClick={() => setFileType('order')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Upload Order File
              </button>
            )}
            {user.role === 'admin' && (
              <button
                onClick={() => setFileType('master')}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Upload Master File
              </button>
            )}
            {orderData.length > 0 && (
              <button
                onClick={() => handleConfimationModal(orderData)}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Delete Today Data
              </button>
            )}
          </>
        )}
        {fileType && tableData.length > 0 && (
          <>
            <button
              onClick={handleCancel}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Upload
            </button>
          </>
        )}
      </div>
      {fileType && tableData.length === 0 && (
        <FileDropzone onDrop={handleFileUpload} accept=".xlsx, .xls, .csv" />
      )}
      
      <OrderData orderData={orderData} user={user} fetchGetOrderFiles={fetchGetOrderFiles}/>
      {tableData.length > 0 && (
        <div className="mt-4 overflow-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                {Object.keys(tableData[0]).map((key) => (
                  <th key={key} className="px-4 py-2 border-b bg-gray-200">
                    {key}
                  </th>
                ))}
                <th className="px-4 py-2 border-b bg-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index}>
                  {Object.keys(tableData[0]).map((key, i) => (
                    <td key={i} className="px-4 py-2 border-b">
                      {row[key]}
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
      <ConfirmationModal
        isOpen={isModalOpen?.isModalOpen}
        title={isModalOpen?.title}
        message={isModalOpen?.message}
        onProceed={isModalOpen?.onProceed}
        onCancel={isModalOpen?.onCancel}
      />
    </div>
  );
};

export default Dashboard;
