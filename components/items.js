import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa'; 
import Loader from './loader';
import { fetchAllItems, fetchAllSections } from '../actions/actions_creators';

const ItemsManager = (props) => {
    const { user } = props;
    const [items, setItems] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [newItem, setNewItem] = useState({ name: '', value: '', rate: '' });
    const [editableItemId, setEditableItemId] = useState(null);
    const [showNewItemRow, setShowNewItemRow] = useState(false);
    const [loading, setLoading] = useState(false); // New loading state

    useEffect(() => {
        fetchSections();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [selectedSection]);

    const fetchSections = async () => {
        setLoading(true); // Start loading
        try {
            const response = await fetchAllSections()
            setSections(response);
        } catch (error) {
            toast.error('Failed to fetch sections');
        } 
    };

    const fetchItems = async (isCallApi) => {
        setLoading(true); // Start loading
        try {
            const response = await fetchAllItems(isCallApi);
            if (!selectedSection) {
                setItems(response);
                return;
            }else{
                const filteredItems = response.filter((item) => item.section === selectedSection);
                setItems(filteredItems);
            }
        } catch (error) {
            toast.error('Failed to fetch items');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleSectionChange = (e) => setSelectedSection(e.target.value);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewItem({ ...newItem, [name]: value });
    };

    const handleAddItem = async (e) => {
        if (!selectedSection) {
            toast.warn('Section is required');
            return;
        }
        e.preventDefault();
        const payload = { ...newItem, user: { _id: user?._id ?? '', name: user?.name ?? '' }, section: selectedSection };
        setLoading(true); // Start loading
        try {
            const response = await axios.post('/api/items', payload);
            fetchItems(true);
            setItems([response.data.item, ...items]);
            setNewItem({ name: '', value: '', rate: '' });
            toast.success(response.data.message, { autoClose: 500 }); // Set autoClose to 1 second
        } catch (error) {
            toast.error('Failed to add item');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleEditItem = async (item) => {
        if (!item) return;
        setLoading(true); // Start loading
        try {
            const response = await axios.put(`/api/items`, item);
            setItems(items.map((i) => (i._id === item._id ? response.data.item : i)));
            fetchItems(true);
            toast.success('Item updated successfully', { autoClose: 500 }); // Set autoClose to 1 second
        } catch (error) {
            toast.error('Failed to update item');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!itemId) return;
        setLoading(true); // Start loading
        try {
            await axios.delete(`/api/items`, { data: { id: itemId } });
            setItems(items.filter((item) => item._id !== itemId));
            fetchItems(true);
            toast.success('Item deleted successfully', { autoClose: 500 }); // Set autoClose to 1 second
        } catch (error) {
            toast.error('Failed to delete item');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleAddNewRow = () => setShowNewItemRow(true);

    const handleSaveNewItem = async (e) => {
        await handleAddItem(e);
        setShowNewItemRow(false);
    };

    return (
        <div className="relative p-8 bg-gray-50 rounded-lg shadow-lg max-w-4xl mx-auto">
             <ToastContainer /> 
            {loading && (
               <Loader />
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Items Manager</h1>

            <div className="mb-6 flex items-center gap-2">
                <select
                    value={selectedSection}
                    onChange={handleSectionChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    onTouchCancel={true}
                >
                    <option value="">{selectedSection? "Clear Selection" :"Select Section"}</option>
                    {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                            {section.name}
                        </option>
                    ))}
                     
                </select>
                
                {selectedSection && (
                    <button
                        onClick={handleAddNewRow}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <FaPlus /> Add Item
                    </button>
                )}
            </div>

            {showNewItemRow && (
                <table className="w-full mt-2 bg-white rounded-lg shadow-md">
                    <thead>
                        <tr className="bg-gray-100 sticky">
                            <th className="py-3 px-4 text-left">Name</th>
                            <th className="py-3 px-4 text-left">Value</th>
                            <th className="py-3 px-4 text-left">Rate</th>
                            <th className="py-3 px-4 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="py-2 px-4">
                                <input
                                    type="text"
                                    name="name"
                                    value={newItem.name}
                                    onChange={handleInputChange}
                                    placeholder="Item Name"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                                />
                            </td>
                            <td className="py-2 px-4">
                                <input
                                    type="text"
                                    name="value"
                                    value={newItem.value}
                                    onChange={handleInputChange}
                                    placeholder="Item Value"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                                />
                            </td>
                            <td className="py-2 px-4">
                                <input
                                    type="number"
                                    name="rate"
                                    value={newItem.rate}
                                    onChange={handleInputChange}
                                    placeholder="Item Rate"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                                />
                            </td>
                            <td className="py-2 px-4">
                                <button
                                    onClick={handleSaveNewItem}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                                >
                                    Save
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}

<div className="overflow-auto max-h-80"> {/* Scrollable container */}
    <table className="w-full mt-6 bg-white rounded-lg shadow-md">
        <thead className="bg-gray-100">
            <tr className="sticky top-0 bg-gray-100 z-10"> {/* Make header sticky */}
                <th className="py-3 px-4 text-left">Section</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Value</th>
                <th className="py-3 px-4 text-left">Rate</th>
                <th className="py-3 px-4 text-left">Actions</th>
            </tr>
        </thead>
        <tbody>
            {items.map((item) => (
                <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">
                        {sections?.find((s) => s._id === item.section)?.name}
                    </td>
                    <td className="py-2 px-4">
                        {editableItemId === item._id ? (
                            <input
                                type="text"
                                defaultValue={item.name}
                                onBlur={(e) => {
                                    handleEditItem({ ...item, name: e.target.value });
                                    setEditableItemId(null);
                                }}
                                className="w-full border p-2 rounded-lg"
                            />
                        ) : (
                            item.name
                        )}
                    </td>
                    <td className="py-2 px-4">
                        {editableItemId === item._id ? (
                            <input
                                type="text"
                                defaultValue={item.value}
                                onBlur={(e) => {
                                    handleEditItem({ ...item, value: e.target.value });
                                    setEditableItemId(null);
                                }}
                                className="w-full border p-2 rounded-lg"
                            />
                        ) : (
                            item.value
                        )}
                    </td>
                    <td className="py-2 px-4">
                        {editableItemId === item._id ? (
                            <input
                                type="number"
                                defaultValue={item.rate}
                                onBlur={(e) => {
                                    handleEditItem({ ...item, rate: e.target.value });
                                    setEditableItemId(null);
                                }}
                                className="w-full border p-2 rounded-lg"
                            />
                        ) : (
                            item.rate
                        )}
                    </td>
                    <td className="py-2 px-4 flex space-x-2">
                        <button
                            onClick={() => setEditableItemId(item._id)}
                            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
                        >
                            <FaEdit />
                        </button>
                        <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"
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

export default ItemsManager;
