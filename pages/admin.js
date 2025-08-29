import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminPortal = () => {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await axios.get('/api/admin/company', { headers: { Authorization: `Bearer ${token}` } });
        setCompanies(data?.companies || []);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const toggleFlag = async (companyId, nextFlags) => {
    try {
      setSavingId(companyId);
      const token = localStorage.getItem('token');
      const { data } = await axios.put(`/api/admin/company/${companyId}`, { featureFlags: nextFlags }, { headers: { Authorization: `Bearer ${token}` } });
      setCompanies(prev => prev.map(c => c._id === companyId ? { ...c, featureFlags: data?.featureFlags || nextFlags } : c));
    } catch (e) {
    } finally {
      setSavingId(null);
    }
  };

  if (!user || user.role !== 'ADMINISTRATOR') {
    return <div className="p-4">Unauthorized</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Administrator Portal</h1>
      {loading ? (
        <div>Loading companies…</div>
      ) : (
        <div className="space-y-4">
          {companies.map(company => (
            <div key={company._id} className="border p-4 rounded">
              <div className="font-semibold mb-2">{company.companyName}</div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!!company.featureFlags?.isExtractSKU}
                  onChange={(e) => toggleFlag(company._id, { ...company.featureFlags, isExtractSKU: e.target.checked })}
                  disabled={savingId === company._id}
                />
                <span>Enable Extract SKU</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPortal;


