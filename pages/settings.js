import React, { useEffect, useState } from 'react';
import SectionManager from '../components/sections';
import ItemsManager from '../components/items';
import WorkerDetails from '../components/WorkerDetails';
import PartyDashboard from './party_dashboard';
import PartyDetails from '../components/partyDetails';
import { checkPermission, PERMISSIONS } from '../lib/constants';
import axios from 'axios';

const SettingsTabs = () => {
  const [selectedTab, setSelectedTab] = useState();
  const [user, setUser] = useState(null);
  const [flags, setFlags] = useState(null);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await axios.get('/api/company/flags', { headers: { Authorization: `Bearer ${token}` } });
        setFlags(data?.featureFlags || {});
      } catch (e) {}
    };
    fetchFlags();
  }, []);

  const saveFlags = async (nextFlags) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const { data } = await axios.put('/api/company/flags', { featureFlags: nextFlags }, { headers: { Authorization: `Bearer ${token}` } });
      
      // Optimistically set, then hard refresh from server to ensure persisted state
      setFlags(data?.featureFlags || nextFlags);
      
      try {
        const refreshed = await axios.get('/api/company/flags', { headers: { Authorization: `Bearer ${token}` } });
        setFlags(refreshed?.data?.featureFlags || data?.featureFlags || nextFlags);
      } catch {}
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };
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
            {(user?.role === 'ADMINISTRATOR' || user?.role === 'admin') && (
              <div className="mt-6 p-4 border rounded">
                <h2 className="text-lg font-semibold mb-2">Company Feature Flags</h2>
                {flags ? (
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!flags.isExtractSKU}
                        onChange={(e) => saveFlags({ ...flags, isExtractSKU: e.target.checked })}
                        disabled={saving}
                      />
                      <span>Enable Extract SKU</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!flags.isExcelFromPDF}
                        onChange={(e) => saveFlags({ ...flags, isExcelFromPDF: e.target.checked })}
                        disabled={saving}
                      />
                      <span>Enable Excel from PDF (UI-only)</span>
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loading flags…</p>
                )}
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
