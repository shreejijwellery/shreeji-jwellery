// components/PartyDetails.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaTrash, FaPlus, FaEdit, FaSave } from 'react-icons/fa';
import Loader from './loader'; // Assume a custom loader component
import { fetchAllParties } from '../actions/actions_creators';

const PartyDetails = props => {
  const { user } = props;
  const [workers, setWorkers] = useState([]);
  const [newWorker, setNewWorker] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async isCallApi => {
    setLoading(true);
    try {
      const response = await fetchAllParties(isCallApi);
      setWorkers(response);
    } catch (error) {
      toast.error('Failed to fetch workers.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorker = async () => {
    setLoading(true);
    try {
      await axios.post('/api/party', { ...newWorker, created_by: user._id });
      toast.success('Vendor added successfully!', { autoClose: 500 });
      fetchWorkers(true);
      setNewWorker({ name: '', lastname: '', mobile_no: '', address: '' });
    } catch (error) {
      toast.error('Failed to add worker.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async id => {
    setLoading(true);
    try {
      await axios.delete(`/api/party/${id}`);
      toast.success('Vendor deleted successfully!', { autoClose: 500 });
      fetchWorkers(true);
    } catch (error) {
      toast.error('Failed to delete worker.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditWorker = async () => {
    setLoading(true);
    try {
      await axios.put(`/api/party`, editingWorker);
      toast.success('Vendor updated successfully!', { autoClose: 500 });
      fetchWorkers(true);
      setEditingWorker(null);
    } catch (error) {
      toast.error('Failed to update worker.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e, field) => {
    setEditingWorker({ ...editingWorker, [field]: e.target.value });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gradient-to-r from-blue-50 to-white rounded-xl shadow-lg">
      <ToastContainer />
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Vendor Details</h1>
      {loading && <Loader />} {/* Loader Component */}
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">Add New Vendor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <input
          type="text"
          placeholder="Name"
          value={newWorker.name}
          onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
          className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleCreateWorker}
          className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md transition">
          <FaPlus className="mr-2" /> Add Vendor
        </button>
      </div>
      <div className="overflow-auto max-h-96">
        <table className="min-w-full bg-white rounded-lg shadow-md border-collapse">
          <thead>
            <tr className="bg-blue-100 sticky top-0 z-10">
              <th className="py-4 px-6 text-left text-gray-700 font-semibold">Name</th>
              <th className="py-4 px-6 text-center text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(worker => (
              <tr key={worker._id} className="hover:bg-gray-50 border-b transition">
                <td className="py-3 px-6">
                  {editingWorker && editingWorker._id === worker._id ? (
                    <input
                      type="text"
                      value={editingWorker.name}
                      onChange={e => handleEditChange(e, 'name')}
                      className="p-1 border border-gray-300 rounded-md"
                    />
                  ) : (
                    worker.name
                  )}
                </td>
               
                <td className="py-3 px-6 text-center">
                  {editingWorker && editingWorker._id === worker._id ? (
                    <button
                      onClick={handleEditWorker}
                      className="text-green-500 hover:text-green-600 transition">
                      <FaSave /> Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingWorker(worker)}
                      className="text-blue-500 hover:text-blue-600 transition">
                      <FaEdit />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteWorker(worker._id)}
                    className="text-red-500 hover:text-red-600 transition ml-2">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartyDetails;
