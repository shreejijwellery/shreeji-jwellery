import React, { useEffect, useState } from 'react';
import SectionManager from '../components/sections';

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


          </div>
          <div className="mt-4">
            {selectedTab === 'sections' && <SectionManager user={user} />}
          
          </div>
        </div>
      ) : (
        <div className="p-4">Please login to view this page</div>
      )}
    </>
  );
};

export default SettingsTabs;
