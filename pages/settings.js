import React, { useEffect, useState } from 'react';
import SectionManager from '../components/sections';

import { checkPermission, PERMISSIONS } from '../lib/constants';
import SubSectionManager from '../components/subSections';
import EquipmentManager from '../components/EquipmentManager';
import ParameterManager from '../components/ParameterManager';

const SettingsTabs = () => {
  const [selectedTab, setSelectedTab] = useState();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setUser(userData);
      switch (true) {
        case checkPermission(userData, PERMISSIONS.WORKERS): setSelectedTab('workers'); break;
        case checkPermission(userData, PERMISSIONS.PARTY_BILLS): setSelectedTab('party'); break;
        case checkPermission(userData, PERMISSIONS.SECTIONS): setSelectedTab('sections'); break;
        case checkPermission(userData, PERMISSIONS.ITEMS): setSelectedTab('items'); break;
      }
    }
  }, []);
  return (
    <>
      {user ? (
        <div className="p-4">
          <div className="flex space-x-4">
          <button
            onClick={() => setSelectedTab('sections')}
            className={`px-4 py-2 ${selectedTab === 'sections' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-md`}
          >
            Sections
          </button>
          <button
            onClick={() => setSelectedTab('sub-sections')}
            className={`px-4 py-2 ${selectedTab === 'sub-sections' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-md`}
          >
            Sub Sections
          </button>
          <button
            onClick={() => setSelectedTab('equipments')}
            className={`px-4 py-2 ${selectedTab === 'equipments' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-md`}
          >
            Equipments
          </button>
          <button
            onClick={() => setSelectedTab('parameters')}
            className={`px-4 py-2 ${selectedTab === 'parameters' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-md`}
          >
            Parameters
          </button>
          </div>
          <div className="mt-4">
            {selectedTab === 'sections' && <SectionManager user={user} />}
            {selectedTab === 'sub-sections' && <SubSectionManager user={user} />}
            {selectedTab === 'equipments' && <EquipmentManager user={user} />}
            {selectedTab === 'parameters' && <ParameterManager user={user} />}
          </div>
        </div>
      ) : (
        <div className="p-4">Please login to view this page</div>
      )}
    </>
  );
};

export default SettingsTabs;
