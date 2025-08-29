// components/WorkerDetails.js
import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 
import { FaTrash, FaPlus, FaEdit, FaSave } from 'react-icons/fa';
import Loader from './loader'; // Assume a custom loader component
import { fetchAllWorker, HTTP } from '../actions/actions_creators';

const WorkerDetails = (props) => {
    const { user } = props;
    const [workers, setWorkers] = useState([]);
    const [newWorker, setNewWorker] = useState({ name: '', lastname: '', mobile_no: '', address: '', bank_account_no: '', bank_name: '', bank_branch: '', bank_ifsc: '', bank_account_holder_name: '' });
    const [loading, setLoading] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async (isCallApi) => {
        setLoading(true);
        try {
            const response = await fetchAllWorker(isCallApi);
            setWorkers(response);
        } catch (error) {
            toast.error("Failed to fetch workers.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorker = async () => {
        setLoading(true);
        try {
            const response = await HTTP('POST','/workers', { ...newWorker });
            toast.success("Worker added successfully!", { autoClose: 500 });
            fetchWorkers(true);
            setNewWorker({ name: '', lastname: '', mobile_no: '', address: '', bank_account_no: '', bank_name: '', bank_branch: '', bank_ifsc: '', bank_account_holder_name: ''  });
        } catch (error) {
            toast.error("Failed to add worker.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWorker = async (id) => {
        setLoading(true);
        try {
            const response = await HTTP('DELETE',`/workers/${id}`);
            toast.success("Worker deleted successfully!", { autoClose: 500 });
            fetchWorkers(true);
        } catch (error) {
            toast.error("Failed to delete worker.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditWorker = async () => {
        setLoading(true);
        try {
            const response = await HTTP('PUT',`/workers`, editingWorker);
            toast.success("Worker updated successfully!", { autoClose: 500 });
            fetchWorkers(true);
            setEditingWorker(null);
        } catch (error) {
            toast.error("Failed to update worker.");
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
            <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Worker Details</h1>

            {loading && <Loader />} {/* Loader Component */}

            <h2 className="text-2xl font-semibold mb-6 text-gray-700">Add New Worker</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <input
                    type="text"
                    placeholder="Name"
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="text"
                    placeholder="Lastname"
                    value={newWorker.lastname}
                    onChange={(e) => setNewWorker({ ...newWorker, lastname: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="text"
                    placeholder="Mobile No"
                    value={newWorker.mobile_no}
                    onChange={(e) => setNewWorker({ ...newWorker, mobile_no: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="text"
                    placeholder="Address"
                    value={newWorker.address}
                    onChange={(e) => setNewWorker({ ...newWorker, address: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="text"
                    placeholder="Bank Account No"
                    value={newWorker.bank_account_no}
                    onChange={(e) => setNewWorker({ ...newWorker, bank_account_no: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                
                <input
                    type="text"
                    placeholder="Bank IFSC"
                    value={newWorker.bank_ifsc}
                    onChange={(e) => setNewWorker({ ...newWorker, bank_ifsc: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="text"
                    placeholder="Account Holder Name"
                    value={newWorker.bank_account_holder_name}
                    onChange={(e) => setNewWorker({ ...newWorker, bank_account_holder_name: e.target.value })}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                />
                <button
                    onClick={handleCreateWorker}
                    className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md transition"
                >
                    <FaPlus className="mr-2" /> Add Worker
                </button>
            </div>

            <div className="overflow-auto max-h-96">
                <table className="min-w-full bg-white rounded-lg shadow-md border-collapse">
                    <thead>
                        <tr className="bg-blue-100 sticky top-0 z-10">
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Name</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Lastname</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Mobile No</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Address</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Bank Account No</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Bank Name</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Bank Branch</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Bank IFSC</th>
                            <th className="py-4 px-6 text-left text-gray-700 font-semibold">Account Holder Name</th>
                            <th className="py-4 px-6 text-center text-gray-700 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workers.map((worker) => (
                            <tr key={worker._id} className="hover:bg-gray-50 border-b transition">
                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.name}
                                            onChange={(e) => handleEditChange(e, 'name')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.name
                                    )}
                                </td>
                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.lastname}
                                            onChange={(e) => handleEditChange(e, 'lastname')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.lastname
                                    )}
                                </td>
                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.mobile_no}
                                            onChange={(e) => handleEditChange(e, 'mobile_no')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.mobile_no
                                    )}
                                </td>
                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.address}
                                            onChange={(e) => handleEditChange(e, 'address')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.address
                                    )}
                                </td>

                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.bank_account_no}
                                            onChange={(e) => handleEditChange(e, 'bank_account_no')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.bank_account_no
                                    )}
                                </td>
                                <td className="py-3 px-6">
                                    {worker.bank_name}
                                </td>
                                <td className="py-3 px-6">
                                    {worker.bank_branch}
                                </td>
                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.bank_ifsc}
                                            onChange={(e) => handleEditChange(e, 'bank_ifsc')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.bank_ifsc
                                    )}
                                </td>
                                <td className="py-3 px-6">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <input
                                            type="text"
                                            value={editingWorker.bank_account_holder_name}
                                            onChange={(e) => handleEditChange(e, 'bank_account_holder_name')}
                                            className="p-1 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        worker.bank_account_holder_name
                                    )}
                                </td>
                                
                                <td className="py-3 px-6 text-center">
                                    {editingWorker && editingWorker._id === worker._id ? (
                                        <button
                                            onClick={handleEditWorker}
                                            className="text-green-500 hover:text-green-600 transition"
                                        >
                                            <FaSave /> Save
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setEditingWorker(worker)}
                                            className="text-blue-500 hover:text-blue-600 transition"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteWorker(worker._id)}
                                        className="text-red-500 hover:text-red-600 transition ml-2"
                                    >
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

export default WorkerDetails;
