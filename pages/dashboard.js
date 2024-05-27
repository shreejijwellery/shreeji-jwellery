import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';
import FileDropzone from '../components/FileDropzone';
import * as xlsx from 'xlsx';
import 'tailwindcss/tailwind.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [orderData, setOrderData] = useState([]);
  const [addNewPrice, setAddNewPrice] = useState({});
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
          fetchGetOrderFiles()
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
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error('Error uploading data. Please try again.');
    }
  };
 
  const fetchGetOrderFiles = async () => {
    try {
      const response = await axios.get('/api/getOrderFiles', {
        params: {
          // user: {
          //   userId: user._id,
          //   name: user.name,
          // },
        },
      });

      if (response.status === 200) {
        const result = response?.data?.data?.map(item => {
          return {
            'SKU': item.sku,
            'Quantity': item.quantity,
            'Price': item.price || 0,
            'Final Price': (item.quantity || 0) + (item.price || 0),
            'Remarks' : !item.price ? 'Price not found' : ''
          }
        });
        setOrderData(result);
        toast.success('Order files fetched successfully!');
      }
    } catch (error) {
      console.error('Error fetching order files:', error);
      toast.error('Error fetching order files. Please try again.');
    }
  }
  const handleCancel = () => {
    setTableData([]);
    setFileType(null);
  };

  const handlePrice = (row) => {
    console.log(row);
    setAddNewPrice(row);
  }
  const addPrice = async ( price) => {
    console.log("Add price", price);
    // try {
    //   const response = await axios.post('/api/addPrice', {
    //     sku,
    //   });

    //   if (response.status === 200) {
    //     toast.success('Price added successfully!');
    //     fetchGetOrderFiles()
    //   }
    // } catch (error) {
    //   console.error('Error adding price:', error);
    //   toast.error('Error adding price. Please try again.');
    // }
  }
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
            <button
              onClick={() => setFileType('order')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Upload Order File
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setFileType('master')}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Upload Master File
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
     {addNewPrice?.SKU && (
  <div className="mt-4">
    <label htmlFor="price" className="block mb-2">
      Add Price for {addNewPrice.SKU}
    </label>
    <div className="flex items-center space-x-4">
      <input
        id="price"
        type="number"
        value={addNewPrice.Price}
        onChange={(e) => setAddNewPrice({ ...addNewPrice, Price: e.target.value })}
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
                {Object.keys(orderData[0]).map((key) => (
                  <th key={key} className="px-4 py-2 border-b bg-gray-200">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderData.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-4 py-2 border-b">
                      {value} {value === 'Price not found' && <button onClick={() =>(handlePrice(row))} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Add Price</button>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )  
      }
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
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-4 py-2 border-b">
                      {value}
                    </td>
                  ))}
                </tr>
                
              ))}
            </tbody>
          </table>
        </div>
      )}
      
    </div>
  );
};

export default Dashboard;
