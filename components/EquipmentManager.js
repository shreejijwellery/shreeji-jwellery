import React, { useEffect, useState } from 'react';
import { fetchAllSections, fetchAllSubSections, HTTP } from '../actions/actions_creators';
import { FaEdit, FaSave, FaTimes, FaTrash } from 'react-icons/fa';

export default function EquipmentManager({ user }) {
  const [sections, setSections] = useState([]);
  const [subSections, setSubSections] = useState([]);
  const [section, setSection] = useState('');
  const [subSection, setSubsection] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [RTO, setRTO] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editedEquipment, setEditedEquipment] = useState({});
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [equipmentCapacity, setEquipmentCapacity] = useState([]);
  const [equipmentCompany, setEquipmentCompany] = useState([]);
  
  useEffect(() => {
    fetchSections();
    fetchEquipment();
    fetchEquipmentTypes();
    fetchEquipmentCapacity();
    fetchEquipmentCompany();
  }, []);

  const fetchEquipment = async () => {
    const response = await HTTP('GET', '/equipments');
    setEquipment(response?.equipments ?? []);
  };

  const fetchSections = async () => {
    const response = await fetchAllSections();
    setSections(response);
    fetchSubSections();
  };

  const fetchEquipmentTypes = async () => {
    const response = await HTTP('GET', '/equipment-types');
    console.log(response?.data);
    setEquipmentTypes(response?.data ?? []);
  };

  const fetchEquipmentCapacity = async () => {
    const response = await HTTP('GET', '/equipment-capacity');
    setEquipmentCapacity(response?.data ?? []);
  };

  const fetchEquipmentCompany = async () => {
    const response = await HTTP('GET', '/equipment-company');
    setEquipmentCompany(response?.data ?? []);
  };

  const fetchSubSections = async () => {
    const response = await fetchAllSubSections();
    if (section) {
      const filteredSubSections = response.filter(subSection => subSection.section === section);
      setSubSections(filteredSubSections);
    } else {
      setSubSections(response);
    }
  };

  const handleAddEquipment = async () => {
    const response = await HTTP('POST', '/equipments', {
      name,
      type,
      subSection,
      section,
      capacity,
      RTO,
      manufacturer,
    });
    fetchEquipment();
  };

  const handleDeleteEquipment = async id => {
    const response = await HTTP('DELETE', '/equipments', { id });
    fetchEquipment();
  };

  const handleEditEquipment = item => {
    setEditingItemId(item._id);
    setEditedEquipment({
      name: item.name,
      type: item.type,
      capacity: item.capacity,
      RTO: item.RTO,
      manufacturer: item.manufacturer,
    });
  };

  const handleSaveEquipment = async _id => {
    const response = await HTTP('PUT', '/equipments', { _id, ...editedEquipment });
    fetchEquipment();
    setEditingItemId(null);
  };

  return (
<>
    <div className="p-6 bg-gray-100 dark:bg-gray-800 min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-200">
        Equipment Manager
      </h1>
    
      <div className="flex flex-col lg:flex-row lg:justify-between items-center mb-6 gap-4">
        <select
          className="p-3 border border-gray-300 rounded w-full lg:w-1/3 bg-white dark:bg-gray-700 dark:text-gray-200
            focus:ring-2 focus:ring-blue-500 transition-transform hover:scale-105"
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="" className="text-gray-500">
            Select Section
          </option>
          {sections.map((section) => (
            <option key={section._id} value={section._id}>
              {section.name}
            </option>
          ))}
        </select>
    
        {section && (
          <select
            className="p-3 border border-gray-300 rounded w-full lg:w-1/3 bg-white dark:bg-gray-700 dark:text-gray-200
              focus:ring-2 focus:ring-blue-500 transition-transform hover:scale-105"
            onChange={(e) => setSubsection(e.target.value)}
          >
            <option value="" className="text-gray-500">
              Select Subsection
            </option>
            {subSections.map((subSection) => (
              <option key={subSection._id} value={subSection._id}>
                {subSection.name}
              </option>
            ))}
          </select>
        )}
      </div>
    
      {subSection && (
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsAddingEquipment(!isAddingEquipment)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-transform 
              hover:scale-105 lg:w-1/4 w-full text-center"
          >
            {isAddingEquipment ? 'Cancel' : 'Add Equipment'}
          </button>
        </div>
      )}
    
      {isAddingEquipment && (
        <div className="mb-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Equipment Name"
            className="p-2 border border-gray-300 rounded w-full mb-2"
          />
          <select
            value={type}
            onChange={e => {
              if (e.target.value === 'CREATE_NEW') {
                setType('');
              } else {
                setType(e.target.value);
              }
            }}
            className="border rounded p-2">
            <option value="" className="text-gray-500">Select Equipment Type</option>
            {equipmentTypes?.map(type => (
              <option key={type._id} value={type._id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            className="border rounded p-2">
            <option value="" className="text-gray-500">Select Equipment Capacity</option>
            {equipmentCapacity?.map(capacity => (
              <option key={capacity._id} value={capacity._id}>
                {capacity.name}
              </option>
            ))}
          </select>
          <select
            value={manufacturer}
            onChange={e => setManufacturer(e.target.value)}
            className="border rounded p-2">
            <option value="" className="text-gray-500">Select Equipment Manufacturer</option>
            {equipmentCompany?.map(company => (
              <option key={company._id} value={company._id}>
                {company.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={RTO}
            onChange={e => setRTO(e.target.value)}
            placeholder="RTO"
            className="p-2 border border-gray-300 rounded w-full mb-2"
          />

          <button
            onClick={handleAddEquipment}
            className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 w-full">
            Add Equipment
          </button>
        </div>
      )}

      {equipment.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Section</th>
                <th className="p-2 text-left">SubSection</th>
                <th className="p-2 text-left">Equipment</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Capacity</th>
                <th className="p-2 text-left">RTO</th>
                <th className="p-2 text-left">Manufacturer</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipment?.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{item.section?.name}</td>
                  <td className="p-2">{item.subSection?.name}</td>
                  {editingItemId === item._id ? (
                    <>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editedEquipment.name}
                          onChange={e =>
                            setEditedEquipment({ ...editedEquipment, name: e.target.value })
                          }
                          className="border border-gray-300 rounded w-full"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editedEquipment.type}
                          onChange={e =>
                            setEditedEquipment({ ...editedEquipment, type: e.target.value })
                          }
                          className="border border-gray-300 rounded w-full"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editedEquipment.capacity}
                          onChange={e =>
                            setEditedEquipment({ ...editedEquipment, capacity: e.target.value })
                          }
                          className="border border-gray-300 rounded w-full"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editedEquipment.RTO}
                          onChange={e =>
                            setEditedEquipment({ ...editedEquipment, RTO: e.target.value })
                          }
                          className="border border-gray-300 rounded w-full"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editedEquipment.manufacturer}
                          onChange={e =>
                            setEditedEquipment({ ...editedEquipment, manufacturer: e.target.value })
                          }
                          className="border border-gray-300 rounded w-full"
                        />
                      </td>
                      <td className="p-2 flex items-center">
                        <div
                          onClick={() => handleSaveEquipment(item._id)}
                          className="text-white p-2 rounded hover:bg-green-100 cursor-pointer">
                          <FaSave className="w-5 h-5 text-green-500 hover:text-green-600" />
                        </div>
                        <div
                          onClick={() => setEditingItemId(null)}
                          className="text-white p-2 rounded hover:bg-gray-100 cursor-pointer">
                          <FaTimes className="w-5 h-5 text-gray-500 hover:text-gray-600" />
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.type}</td>
                      <td className="p-2">{item.capacity}</td>
                      <td className="p-2">{item.RTO}</td>
                      <td className="p-2">{item.manufacturer}</td>
                      <td className="p-2 flex items-center">
                        <div
                          onClick={() => handleEditEquipment(item)}
                          className="text-white p-2 rounded hover:bg-blue-100 cursor-pointer">
                          <FaEdit className="w-5 h-5 text-blue-500 hover:text-blue-600" />
                        </div>
                        <div
                          onClick={() => handleDeleteEquipment(item._id)}
                          className="text-white p-2 rounded hover:bg-red-100 cursor-pointer">
                          <FaTrash className="w-5 h-5 text-red-500 hover:text-red-600" />
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
