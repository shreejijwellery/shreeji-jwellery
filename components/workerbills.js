import React, { useEffect, useState } from 'react';
import { fetchAllItems, fetchAllSections } from '../actions/actions_creators';
import { FaEdit, FaSave, FaTimes, FaTrash } from 'react-icons/fa';


export default function WorkerBills(props) {
  const { selectedWorker } = props;
  const [workDetails, setWorkDetails] = useState([]);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [newWorkDetail, setNewWorkDetail] = useState({
    section: '',
    item: '',
    piece: '',
    item_rate: '',
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetchAllSections();
        setSections(response);
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };

    const fetchItems = async () => {
      try {
        const response = await fetchAllItems();
        setItems(response);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchSections();
    fetchItems();
  }, []);

  const fetchWorkDetails = async () => {
    try {
      const response = await fetch(`/api/work_records?worker=${selectedWorker._id}`);
      const data = await response.json();
      setWorkDetails(data);
    } catch (error) {
      console.error('Error fetching work details:', error);
    }
  };

  useEffect(() => {
    if (selectedWorker) fetchWorkDetails();
    else setWorkDetails([]);
  }, [selectedWorker]);

  const handleAddWorkDetail = async () => {
    const { section, item, piece, item_rate } = newWorkDetail;
    const section_name = sections.find((s) => s._id === section)?.name || '';
    const item_name = items.find((i) => i._id === item)?.name || '';
    const amount = Number(piece) * Number(item_rate);

    try {
      const response = await fetch('/api/work_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          section_name,
          item,
          item_name,
          piece,
          item_rate,
          worker: selectedWorker._id,
          worker_name: selectedWorker.name,
          amount,
        }),
      });

      const newDetail = await response.json();
      setWorkDetails([...workDetails, newDetail]);
      setNewWorkDetail({ section: '', item: '', piece: '', item_rate: '' });
    } catch (error) {
      console.error('Error adding work detail:', error);
    }
  };

  const handleNewWorkDetailChange = (e) => {
    const { name, value } = e.target;
    setNewWorkDetail((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSectionChange = (e) => {
    const sectionId = e.target.value;
    const selectedSection = sections.find((section) => section._id === sectionId);

    setNewWorkDetail((prevData) => ({
      ...prevData,
      section: sectionId,
      item: '', // Clear item when section changes
      item_rate: '',
    }));
    setFilteredItems(items.filter((item) => item.section === sectionId));
  };

  const handleItemChange = (e) => {
    const itemId = e.target.value;
    const selectedItem = items.find((item) => item._id === itemId);
    setNewWorkDetail((prevData) => ({
      ...prevData,
      item: itemId,
      item_rate: selectedItem?.rate || '',
    }));
  };

  const handleEditClick = (detail) => {
    setEditingRow(detail._id);
    setEditData({ ...detail });
    setFilteredItems(items.filter((item) => item.section === detail.section));
  };

  const handleSaveClick = async () => {
    try {
      const updatedData = {
        ...editData,
        amount: editData.piece * editData.item_rate,
      };

      const response = await fetch(`/api/work_records?id=${editingRow}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const savedData = await response.json();

      setWorkDetails((prevWorkDetails) =>
        prevWorkDetails.map((detail) =>
          detail._id === editingRow ? savedData : detail
        )
      );

      setEditingRow(null);
      setEditData({});
    } catch (error) {
      console.error('Error saving work detail:', error);
    }
  };

  const handleCancelClick = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleDeleteClick = async (id) => {
    try {
      await fetch(`/api/work_records?id=${id}`, { method: 'DELETE' });
      setWorkDetails((prevWorkDetails) => prevWorkDetails.filter((detail) => detail._id !== id));
    } catch (error) {
      console.error('Error deleting work detail:', error);
    }
  };

  const filteredWorkDetails = workDetails.filter(detail => {
    const createdAt = new Date(detail.createdAt);
    const start = new Date(startDate);
   
    const end = new Date(endDate);
    end?.setHours(23, 59, 59, 999);
    return (!startDate || createdAt >= start) && (!endDate || createdAt <= end);
  });

  return (
    <div className="container mx-auto p-4">
      {/* Date Filter Inputs */}
      

      {selectedWorker && (
        <div className="bg-white shadow-lg rounded-lg p-4 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">Add Work Detail</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              name="section"
              value={newWorkDetail.section}
              onChange={handleSectionChange}
              className="border border-gray-300 rounded-lg p-2"
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section._id} value={section._id}>
                  {section.name}
                </option>
              ))}
            </select>

            <select
              name="item"
              value={newWorkDetail.item}
              onChange={handleItemChange}
              className="border border-gray-300 rounded-lg p-2"
            >
              <option value="">Select Item</option>
              {filteredItems.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="piece"
              placeholder="Enter pieces"
              value={newWorkDetail.piece}
              onChange={handleNewWorkDetailChange}
              className="border border-gray-300 rounded-lg p-2"
            />

            <input
              type="number"
              name="item_rate"
              placeholder="Enter rate"
              value={newWorkDetail.item_rate}
              onChange={handleNewWorkDetailChange}
              className="border border-gray-300 rounded-lg p-2"
            />

            <button
              onClick={handleAddWorkDetail}
              className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Work Details Table */}
      <div className="mt-12 bg-white shadow-lg rounded-lg mx-auto max-w-4xl">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Work Details</h2>

        <div className="mb-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 mr-2"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-2"
        />
      </div>
        <div className="overflow-x-auto">
          <div className="min-w-full bg-gray-100 p-4 font-medium text-gray-700 grid grid-cols-7 gap-4">
            <div>Section</div>
            <div>Item</div>
            <div>Piece</div>
            <div>Rate</div>
            <div>Amount</div>
            <div>Time</div>
            <div colSpan="2">Actions</div>
          </div>

          {filteredWorkDetails.length > 0 ? (
            filteredWorkDetails.map((detail) => (
              <div
                key={detail._id}
                className="min-w-full grid grid-cols-7 gap-4 p-4 border-b last:border-none text-gray-700"
              >
                {editingRow === detail._id ? (
                  <>
                    {/* Editable Dropdown for Section */}
                    <select
                      name="section"
                      value={editData.section}
                      onChange={(e) => {
                        const sectionId = e.target.value;
                        const selectedSection = sections.find((section) => section._id === sectionId);
                        setEditData((prevData) => ({
                          ...prevData,
                          section: sectionId,
                          section_name: selectedSection ? selectedSection.name : '',
                          item: '',
                          item_name: '',
                        }));
                        setFilteredItems(items.filter((item) => item.section === sectionId));
                      }}
                      className="border border-gray-300 rounded-lg p-2"
                    >
                      <option value="">Select Section</option>
                      {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                          {section.name}
                        </option>
                      ))}
                    </select>

                    {/* Editable Dropdown for Item */}
                    <select
                      name="item"
                      value={editData.item}
                      onChange={(e) => {
                        const itemId = e.target.value;
                        const selectedItem = items.find((item) => item._id === itemId);
                        setEditData((prevData) => ({
                          ...prevData,
                          item: itemId,
                          item_name: selectedItem ? selectedItem.name : '',
                          item_rate: selectedItem ? selectedItem.rate : 0,
                          amount: selectedItem ? selectedItem.rate * editData.piece : 0,
                        }));
                      }}
                      className="border border-gray-300 rounded-lg p-2"
                    >
                      <option value="">Select Item</option>
                      {filteredItems.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      name="piece"
                      value={editData.piece}
                      onChange={handleEditChange}
                      className="border border-gray-300 rounded-lg p-2"
                    />
                    <input
                      type="number"
                      name="item_rate"
                      value={editData.item_rate}
                      onChange={handleEditChange}
                      className="border border-gray-300 rounded-lg p-2"
                    />
                    <div>{(editData.piece * editData.item_rate).toFixed(2)}</div>

                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveClick}
                        className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                      >
                        <FaSave className="w-5 h-5 text-green-500 hover:text-green-600" />
                      </button>
                      <button
                        onClick={handleCancelClick}
                        className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                      >
                        <FaTimes className="w-5 h-5 text-red-500 hover:text-red-600" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{detail.section_name}</div>
                    <div>{detail.item_name}</div>
                    <div>{detail.piece}</div>
                    <div>{detail.item_rate}</div>
                    <div>{detail.amount ? detail.amount.toFixed(2) : (detail.piece * detail.item_rate).toFixed(2)}</div>
                    <div>{detail.createdAt ? new Date(detail.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(detail)}
                        className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                      >
                        <FaEdit className="w-5 h-5 text-blue-500 hover:text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(detail._id)}
                        className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                      >
                        <FaTrash className="w-5 h-5 text-red-500 hover:text-red-600" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-gray-500 text-center">No work details found</div>
          )}
        </div>
      </div>
    </div>
  );
}
