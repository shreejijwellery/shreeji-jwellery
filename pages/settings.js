import React, { useEffect, useState } from 'react';
import SectionManager from '../components/sections';
import ItemsManager from '../components/items';
import WorkerDetails from '../components/WorkerDetails';

const SettingsTabs = () => {
  const [selectedTab, setSelectedTab] = useState('workers');
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem('user');
    console.log('userData', userData);
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);
  return (
    <>
      {user ? (
        <div className="p-4">
          <div className="flex space-x-4">
          <button
              onClick={() => setSelectedTab('workers')}
              className={`px-4 py-2 rounded ${
                selectedTab === 'workers' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
              }`}>
              Workers
            </button>
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setSelectedTab('sections')}
                  className={`px-4 py-2 rounded ${
                    selectedTab === 'sections' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                  }`}>
                  Sections
                </button>
                <button
                  onClick={() => setSelectedTab('items')}
                  className={`px-4 py-2 rounded ${
                    selectedTab === 'items' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                  }`}>
                  Items
                </button>
              </>
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
          </div>
        </div>
      ) : (
        <div className="p-4">Please login to view this page</div>
      )}
    </>
  );
};

export default SettingsTabs;
