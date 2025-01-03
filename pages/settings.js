import React, { useEffect, useState } from 'react';
import SectionManager from '../components/sections';
import ItemsManager from '../components/items';
import WorkerDetails from '../components/WorkerDetails';
import PartyDashboard from './party_dashboard';
import PartyDetails from '../components/partyDetails';
import { checkPermission, PERMISSIONS } from '../lib/constants';

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
            {checkPermission(user, PERMISSIONS.WORKERS) && (
              <button
                onClick={() => setSelectedTab('workers')}
                className={`px-4 py-2 rounded ${
                  selectedTab === 'workers' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}>
                Workers
              </button>
            )}
            {checkPermission(user, PERMISSIONS.PARTY_BILLS) && (
              <button
                onClick={() => setSelectedTab('party')}
                className={`px-4 py-2 rounded ${
                  selectedTab === 'party' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}>
                Vendor
              </button>
            )}
            {checkPermission(user, PERMISSIONS.SECTIONS) && (
              <>
                <button
                  onClick={() => setSelectedTab('sections')}
                  className={`px-4 py-2 rounded ${
                    selectedTab === 'sections' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                  }`}>
                  Sections
                </button>
              </>
            )}
            {checkPermission(user, PERMISSIONS.ITEMS) && (
              <button
                onClick={() => setSelectedTab('items')}
                className={`px-4 py-2 rounded ${
                  selectedTab === 'items' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}>
                Items
              </button>
            )}
          </div>
          <div className="mt-4">
            {selectedTab === 'sections' && <SectionManager user={user} />}
            {selectedTab === 'items' && (
              <div>
                <ItemsManager user={user} />
              </div>
            )}
            {selectedTab === 'workers' && (
              <div>
                <WorkerDetails user={user} />
              </div>
            )}
            {selectedTab === 'party' && (
              <div>
                <PartyDetails user={user} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4">Please login to view this page</div>
      )}
    </>
  );
};

export default SettingsTabs;
