import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loader from './loader';
import { fetchAllItems, fetchAllSections } from '../actions/actions_creators';

const SectionManager = (props) => {
  const { user } = props;
  const [sections, setSections] = useState([]);
  const [newSection, setNewSection] = useState({ name: '', value: '', user });
  const [editableSectionId, setEditableSectionId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async (isCallApi) => {
    setLoading(true);
    const response = await fetchAllSections(isCallApi);
    console.log(response);
    setSections(response);
    setLoading(false);
  };

  const addSection = async () => {
    try {
      setLoading(true);
      await axios.post('/api/sections', newSection);
      fetchSections(true);
      setNewSection({ name: '', value: '', user });
      toast.success('Section added successfully!', { autoClose: 2000 });
    } catch (error) {
      toast.error('Failed to add section.');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (updatedSection) => {
    try {
      setLoading(true);
      await axios.put(`/api/sections`, updatedSection);
      fetchSections(true);
      setEditableSectionId(null);
      toast.success('Section updated successfully!', { autoClose: 2000 });
    } catch (error) {
      toast.error('Failed to update section.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (id) => {
    try {
      setLoading(true);
      await axios.delete('/api/sections', { data: { id } });
      fetchSections(true);
      fetchAllItems(true)
      toast.success('Section deleted successfully!', { autoClose: 2000 });
    } catch (error) {
      toast.error('Failed to delete section.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <ToastContainer />
      {loading && (
        <Loader />
      )}
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Section Manager
      </h1>

      {/* New Section Form */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Section Name"
          value={newSection.name}
          onChange={(e) =>
            setNewSection({ ...newSection, name: e.target.value, user })
          }
          className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
        />
        <input
          type="text"
          placeholder="Section Value"
          value={newSection.value}
          onChange={(e) =>
            setNewSection({ ...newSection, value: e.target.value })
          }
          className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
        />
        <button
          onClick={addSection}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md transition"
        >
          Add Section
        </button>
      </div>

      {/* Section Table */}
      <div className="overflow-auto max-h-96">
        <table className="w-full border-collapse bg-white rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-200 sticky top-0 z-10">
              <th className="py-4 px-6 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="py-4 px-6 text-left font-semibold text-gray-700">
                Value
              </th>
              <th className="py-4 px-6 text-left font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr
                key={section._id}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="py-3 px-6">
                  <input
                    type="text"
                    defaultValue={section.name}
                    onBlur={(e) =>
                      updateSection({ ...section, name: e.target.value })
                    }
                    className={`w-full rounded-md p-2 ${
                      editableSectionId === section._id
                        ? 'border border-gray-300 focus:ring focus:ring-blue-300'
                        : 'border-0 bg-transparent'
                    }`}
                    disabled={editableSectionId !== section._id}
                  />
                </td>
                <td className="py-3 px-6">
                  <input
                    type="text"
                    defaultValue={section.value}
                    onBlur={(e) =>
                      updateSection({ ...section, value: e.target.value })
                    }
                    className={`w-full rounded-md p-2 ${
                      editableSectionId === section._id
                        ? 'border border-gray-300 focus:ring focus:ring-blue-300'
                        : 'border-0 bg-transparent'
                    }`}
                    disabled={editableSectionId !== section._id}
                  />
                </td>
                <td className="py-3 px-6 flex space-x-2">
                  <div
                    className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                    onClick={() => deleteSection(section._id)}
                  >
                    <FaTrash className="w-5 h-5 text-red-500 hover:text-red-600" />
                  </div>
                  <div
                    className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                    onClick={() =>
                      setEditableSectionId(
                        editableSectionId === section._id ? null : section._id
                      )
                    }
                  >
                    <FaEdit className="w-5 h-5 text-blue-500 hover:text-blue-600" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SectionManager;
