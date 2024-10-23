
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTrash, FaEdit } from 'react-icons/fa'; // Import the trash and edit icons
import { ToastContainer, toast } from 'react-toastify'; // Import toast
import 'react-toastify/dist/ReactToastify.css'; // Import toast styles

const SectionManager = (props) => {
  const { user } = props;
  const [sections, setSections] = useState([]);
  const [newSection, setNewSection] = useState({ name: '', value: '', user });
  const [editableSectionId, setEditableSectionId] = useState(null); // Track which section is being edited
  
  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    const response = await axios.get('/api/sections');
    setSections(response.data.sections);
  };

  const addSection = async () => {
    try {
      console.log("new section", newSection);
      await axios.post('/api/sections', newSection);
      fetchSections();
      setNewSection({ name: '', value: '', user });
      toast.success('Section added successfully!'); // Success toast
    } catch (error) {
      toast.error('Failed to add section.'); // Error toast
    }
  };

  const updateSection = async (updatedSection) => {
    try {
      console.log(updatedSection);
      await axios.put(`/api/sections`, updatedSection);
      fetchSections();
      setEditableSectionId(null); // Disable inputs after saving
      toast.success('Section updated successfully!'); // Success toast
    } catch (error) {
      toast.error('Failed to update section.'); // Error toast
    }
  };

  const deleteSection = async (id) => {
    try {
      await axios.delete('/api/sections', { data: { id } });
      fetchSections();
      toast.success('Section deleted successfully!'); // Success toast
    } catch (error) {
      toast.error('Failed to delete section.'); // Error toast
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <ToastContainer /> {/* Add ToastContainer here */}
      <h1 className="text-2xl font-bold mb-4">Section Manager</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Name"
          value={newSection.name}
          onChange={(e) => setNewSection({ ...newSection, name: e.target.value, user })}
          className="border border-gray-300 rounded-md p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Value"
          value={newSection.value}
          onChange={(e) => setNewSection({ ...newSection, value: e.target.value })}
          className="border border-gray-300 rounded-md p-2 mr-2"
        />
        <button onClick={addSection} className="bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600">
          Add Section
        </button>
      </div>

      <table className="min-w-full bg-white rounded-lg shadow-md">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 text-left">Name</th>
            <th className="py-2 px-4 text-left">Value</th>
            <th className="py-2 px-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section._id} className="border-b hover:bg-gray-100">
              <td className="py-2 px-4">
                <input
                  type="text"
                  defaultValue={section.name}
                  onBlur={(e) => updateSection({ ...section, name: e.target.value })}
                  className={`rounded-md p-1 ${editableSectionId === section._id ? 'border border-gray-300' : 'border-0'}`}
                  disabled={editableSectionId !== section._id} // Disable if not editing
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="text"
                  defaultValue={section.value}
                  onBlur={(e) => updateSection({ ...section, value: e.target.value })}
                  className={`rounded-md p-1 ${editableSectionId === section._id ? 'border border-gray-300' : 'border-0'}`}
                  disabled={editableSectionId !== section._id} // Disable if not editing
                />
              </td>
              <td className="py-2 px-4 flex space-x-2">
                <div className="p-2 hover:bg-gray-200 rounded-full cursor-pointer" onClick={() => deleteSection(section._id)}>
                  <FaTrash className="w-5 h-5 text-red-500 hover:text-red-600" />
                </div>
                <div className="p-2 hover:bg-gray-200 rounded-full cursor-pointer" onClick={() => {
                  if (editableSectionId === section._id) {
                    setEditableSectionId(null); // Disable if already editing
                  } else {
                    setEditableSectionId(section._id); // Enable editing for this section
                  }
                }}>
                  <FaEdit className="w-5 h-5 text-blue-500 hover:text-blue-600" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SectionManager;
