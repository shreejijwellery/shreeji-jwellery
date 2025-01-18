import { useEffect, useState } from 'react';
import { EQUIPMENT_FIELDS } from '../lib/constants';
import CreateNewParameterModel from './create-new-parameter-model';
import { HTTP } from '../actions/actions_creators';
import _ from 'lodash';

export default function ParameterManager() {
  const [selectedTab, setSelectedTab] = useState(EQUIPMENT_FIELDS.TYPE);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [arrayToRender, setArrayToRender] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedTab]);

  const getApiUrl = () => {
    return selectedTab === EQUIPMENT_FIELDS.TYPE
      ? '/equipment-types'
      : selectedTab === EQUIPMENT_FIELDS.CAPACITY
      ? '/equipment-capacity'
      : '/equipment-company';
  };

  const fetchData = async () => {
    const response = await HTTP('GET', getApiUrl());
    setArrayToRender(response.data);
  };

  const submitFunction = async data => {
    console.log(data);
    if (editingItem?._id) {
      data._id = editingItem._id;
      const response = await HTTP('PUT', getApiUrl(), data);
    } else {
      const response = await HTTP('POST', getApiUrl(), data);
    }
    fetchData();

    setOpen(false);
  };

  const deleteItem = async id => {
    const response = await HTTP('DELETE', getApiUrl(), { id });
    fetchData();
  };

  const editItem = item => {
    setEditingItem(item);
    setOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex space-x-4">
        <button
          onClick={() => setSelectedTab(EQUIPMENT_FIELDS.TYPE)}
          className={`px-4 py-2 ${
            selectedTab === EQUIPMENT_FIELDS.TYPE
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          } rounded-md`}>
          Type
        </button>
        <button
          onClick={() => setSelectedTab(EQUIPMENT_FIELDS.CAPACITY)}
          className={`px-4 py-2 ${
            selectedTab === EQUIPMENT_FIELDS.CAPACITY
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          } rounded-md`}>
          Capacity
        </button>
        <button
          onClick={() => setSelectedTab(EQUIPMENT_FIELDS.COMPANY)}
          className={`px-4 py-2 ${
            selectedTab === EQUIPMENT_FIELDS.COMPANY
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          } rounded-md`}>
          Company
        </button>
        <button
          onClick={() => setOpen(true)}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Add New {_.startCase(selectedTab.toLowerCase())}
        </button>
      </div>

      <>
        <div className="mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {arrayToRender.map(item => (
                <tr key={item._id}>
                  <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      onClick={() => editItem(item)}
                      className="mr-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item._id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan="2" className="text-right"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </>

      <div className="mt-4">
        <CreateNewParameterModel
          open={open}
          setOpen={setOpen}
          fieldName={selectedTab}
          submitFunction={submitFunction}
          editingItem={editingItem}
        />
      </div>
    </div>
  );
}
