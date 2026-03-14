import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminPortal = () => {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');
  const [creditAdjust, setCreditAdjust] = useState({});
  const [creditSettings, setCreditSettings] = useState({ pagesPerCredit: 1, pricePerCredit: 1 });
  const [creditSettingsSaving, setCreditSettingsSaving] = useState(false);
  const [signupContext, setSignupContext] = useState({ usersWithContext: [], sameIpGroups: [], sameFingerprintGroups: [] });
  const [signupContextLoading, setSignupContextLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const token = () => localStorage.getItem('token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  const fetchCompanies = async () => {
    try {
      if (!token()) return;
      const { data } = await axios.get('/api/admin/company', { headers: headers() });
      setCompanies(data?.companies || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      if (!token()) return;
      const { data } = await axios.get('/api/admin/users', { headers: headers() });
      setUsers(data?.users || []);
    } catch (e) {}
  };

  const fetchAudit = async () => {
    try {
      if (!token()) return;
      const { data } = await axios.get('/api/admin/audit?limit=100', { headers: headers() });
      setAuditLogs(data?.logs || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchSignupContext = async () => {
    try {
      if (!token()) return;
      setSignupContextLoading(true);
      const { data } = await axios.get('/api/admin/signup-context', { headers: headers() });
      setSignupContext({
        usersWithContext: data?.usersWithContext ?? [],
        sameIpGroups: data?.sameIpGroups ?? [],
        sameFingerprintGroups: data?.sameFingerprintGroups ?? [],
      });
    } catch (e) {
      setSignupContext({ usersWithContext: [], sameIpGroups: [], sameFingerprintGroups: [] });
    } finally {
      setSignupContextLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAudit();
    if (activeTab === 'signupContext') fetchSignupContext();
    if (activeTab === 'creditSettings') {
      axios.get('/api/admin/credits/settings', { headers: headers() })
        .then(({ data }) => setCreditSettings({ pagesPerCredit: data?.pagesPerCredit ?? 1, pricePerCredit: data?.pricePerCredit ?? 1 }))
        .catch(() => {});
    }
  }, [activeTab]);

  const toggleFlag = async (companyId, nextFlags) => {
    try {
      setSavingId(companyId);
      const { data } = await axios.put(`/api/admin/company/${companyId}`, { featureFlags: nextFlags }, { headers: headers() });
      setCompanies(prev => prev.map(c => c._id === companyId ? { ...c, featureFlags: data?.featureFlags || nextFlags } : c));
      await fetchCompanies();
    } catch (e) {
    } finally {
      setSavingId(null);
    }
  };

  const handleAdjustCredits = async (companyId) => {
    const amount = Number(creditAdjust[companyId]?.amount);
    const reason = creditAdjust[companyId]?.reason || '';
    if (!Number.isInteger(amount) || amount === 0) return;
    try {
      setSavingId(companyId);
      await axios.post('/api/admin/credits/adjust', { companyId, amount, reason }, { headers: headers() });
      setCreditAdjust(prev => ({ ...prev, [companyId]: {} }));
      await fetchCompanies();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to adjust credits');
    } finally {
      setSavingId(null);
    }
  };

  const handleBlock = async (userId, companyId, block) => {
    try {
      setSavingId(companyId || userId);
      await axios.post('/api/admin/block', { userId: userId || undefined, companyId: companyId || undefined, block }, { headers: headers() });
      if (companyId) await fetchCompanies();
      if (userId) await fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreditAmountChange = (companyId, value) => {
    setCreditAdjust(prev => {
      const next = { ...prev };
      next[companyId] = { ...(next[companyId] || {}), amount: value };
      return next;
    });
  };
  const handleCreditReasonChange = (companyId, value) => {
    setCreditAdjust(prev => {
      const next = { ...prev };
      next[companyId] = { ...(next[companyId] || {}), reason: value };
      return next;
    });
  };

  const saveCreditSettings = async () => {
    try {
      setCreditSettingsSaving(true);
      const { data } = await axios.put('/api/admin/credits/settings', creditSettings, { headers: headers() });
      setCreditSettings(data || creditSettings);
      toast.success('Credit settings saved.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setCreditSettingsSaving(false);
    }
  };

  if (!user || user.role !== 'ADMINISTRATOR') {
    return <div className="p-4">Unauthorized</div>;
  }

  const featureFlagGroups = [
    {
      title: 'SKU Management Features',
      flags: [
        { key: 'isExtractSKU', label: 'Extract SKU (legacy)' },
        { key: 'isMeeshoSort', label: 'Meesho Sort' },
        { key: 'isSnapdealSort', label: 'Snapdeal Sort' },
        { key: 'isAmazonSort', label: 'Amazon Sort' },
        { key: 'isExcelFromPDF', label: 'Excel from PDF' },
        { key: 'isSKUInventory', label: 'SKU Inventory' },
        { key: 'isCancelledOrders', label: 'Cancelled Orders' },
        { key: 'isReturns', label: 'Returns' },
        { key: 'isCustomerReturns', label: 'Customer Returns' },
      ]
    },
    {
      title: 'Billing & Payment Features',
      flags: [
        { key: 'isPartyBills', label: 'Party Bills' },
        { key: 'isVendorBills', label: 'Vendor Bills' },
        { key: 'isWorkerBills', label: 'Worker Bills' },
        { key: 'isVendorPayments', label: 'Vendor Payments' },
        { key: 'isWorkerPayments', label: 'Worker Payments' },
      ]
    },
    {
      title: 'Production Management Features',
      flags: [
        { key: 'isProductionFlow', label: 'Production Flow' },
        { key: 'isFinalProduct', label: 'Final Product' },
        { key: 'isInProcessProduct', label: 'In-Process Product' },
        { key: 'isPlatting', label: 'Platting' },
      ]
    },
    {
      title: 'Master Data Management Features',
      flags: [
        { key: 'isSections', label: 'Sections' },
        { key: 'isItems', label: 'Items' },
        { key: 'isWorkers', label: 'Workers' },
        { key: 'isVendors', label: 'Vendors' },
      ]
    },
    {
      title: 'Additional Features',
      flags: [
        { key: 'isCalendar', label: 'Calendar' },
        { key: 'isDashboard', label: 'Dashboard' },
        { key: 'isCompanyOrderPreference', label: 'Company Order Preference' },
        { key: 'isCompanyEmailMapping', label: 'Company Email Mapping' },
        { key: 'isFileUpload', label: 'File Upload' },
        { key: 'isMasterFileUpload', label: 'Master File Upload' },
        { key: 'isOrderFileUpload', label: 'Order File Upload' },
      ]
    }
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Administrator Portal</h1>
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button onClick={() => setActiveTab('companies')} className={`px-4 py-2 rounded-t ${activeTab === 'companies' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Companies</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-t ${activeTab === 'users' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Users</button>
        <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-t ${activeTab === 'audit' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Audit Log</button>
        <button onClick={() => setActiveTab('creditSettings')} className={`px-4 py-2 rounded-t ${activeTab === 'creditSettings' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Credit settings</button>
        <button onClick={() => setActiveTab('signupContext')} className={`px-4 py-2 rounded-t ${activeTab === 'signupContext' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Signup context</button>
        <Link href="/admin-pricing" className="px-4 py-2 rounded-t bg-gray-100 hover:bg-gray-200">Pricing &amp; offers</Link>
      </div>

      {activeTab === 'creditSettings' && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Credit rates (used for extraction)</h2>
          <p className="text-sm text-gray-600 mb-4">Credits required = ceil(output pages ÷ pages per credit). E.g. pages per credit = 1 → 1 credit per page; = 2 → 1 credit per 2 pages.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output pages per credit</label>
              <input type="number" step="0.1" min="0.1" className="w-full border rounded px-3 py-2" value={creditSettings.pagesPerCredit} onChange={(e) => setCreditSettings(prev => ({ ...prev, pagesPerCredit: Number(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per credit (display)</label>
              <input type="number" step="0.01" min="0" className="w-full border rounded px-3 py-2" value={creditSettings.pricePerCredit} onChange={(e) => setCreditSettings(prev => ({ ...prev, pricePerCredit: Number(e.target.value) ?? 0 }))} />
            </div>
          </div>
          <button onClick={saveCreditSettings} disabled={creditSettingsSaving} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Save</button>
        </div>
      )}

      {activeTab === 'signupContext' && (
        <div className="space-y-6">
          <h2 className="font-semibold text-lg">Signup context (IP, fingerprint, user agent)</h2>
          <p className="text-sm text-gray-600">Users who signed up after this feature will have signup IP and device fingerprint. Use this to spot multiple accounts from same IP or same device.</p>
          {signupContextLoading ? (
            <div className="text-gray-500">Loading…</div>
          ) : (
            <>
              {signupContext.sameIpGroups.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Same signup IP ({signupContext.sameIpGroups.length} IPs with multiple users)</h3>
                  <div className="space-y-3">
                    {signupContext.sameIpGroups.map((g, i) => (
                      <div key={i} className="bg-white rounded p-3 border border-amber-100">
                        <div className="font-mono text-sm text-amber-800 mb-1">{g.ip} — {g.count} user(s)</div>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {g.users.map((u, j) => (
                            <li key={j}>{u.name} (@{u.username}, {u.mobileNumber}, {u.companyName})</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {signupContext.sameFingerprintGroups.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Same device fingerprint ({signupContext.sameFingerprintGroups.length} fingerprints with multiple users)</h3>
                  <div className="space-y-3">
                    {signupContext.sameFingerprintGroups.map((g, i) => (
                      <div key={i} className="bg-white rounded p-3 border border-blue-100">
                        <div className="font-mono text-xs text-blue-800 mb-1 truncate max-w-full" title={g.fingerprint}>{g.fingerprint} — {g.count} user(s)</div>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {g.users.map((u, j) => (
                            <li key={j}>{u.name} (@{u.username}, {u.mobileNumber}, {u.companyName})</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white border rounded-lg p-4 overflow-x-auto">
                <h3 className="font-semibold mb-2">All users (with signup context when available)</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Username</th>
                      <th className="text-left py-2">Mobile</th>
                      <th className="text-left py-2">Company</th>
                      <th className="text-left py-2">Signup IP</th>
                      <th className="text-left py-2">Fingerprint</th>
                      <th className="text-left py-2">User-Agent (snippet)</th>
                      <th className="text-left py-2">Signed up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signupContext.usersWithContext.map((u) => (
                      <tr key={u._id} className="border-b">
                        <td className="py-2">{u.name}</td>
                        <td>{u.username}</td>
                        <td>{u.mobileNumber}</td>
                        <td>{u.companyName}</td>
                        <td className="font-mono text-xs">{u.signupIp || '—'}</td>
                        <td className="font-mono text-xs max-w-[8rem] truncate" title={u.signupFingerprint || ''}>{u.signupFingerprint || '—'}</td>
                        <td className="max-w-[12rem] truncate text-xs text-gray-600" title={u.signupUserAgent || ''}>{u.signupUserAgent ? u.signupUserAgent.slice(0, 60) + (u.signupUserAgent.length > 60 ? '…' : '') : '—'}</td>
                        <td className="text-gray-600">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white border rounded-lg p-4 overflow-x-auto">
          <h2 className="font-semibold mb-2">Admin audit log</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Time</th><th className="text-left py-2">Admin</th><th className="text-left py-2">Action</th><th className="text-left py-2">Target</th><th className="text-left py-2">Details</th></tr></thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id} className="border-b">
                  <td className="py-2">{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.adminUserId?.username}</td>
                  <td>{log.action}</td>
                  <td>{log.targetType} {log.targetId?.toString?.()}</td>
                  <td className="max-w-xs truncate">{JSON.stringify(log.details || {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white border rounded-lg p-4 overflow-x-auto">
          <h2 className="font-semibold mb-2">Users</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Name</th><th className="text-left py-2">Username</th><th className="text-left py-2">Company</th><th className="text-left py-2">Blocked</th><th className="text-left py-2">Action</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b">
                  <td className="py-2">{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.company?.companyName}</td>
                  <td>{u.isBlocked ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleBlock(u._id, null, !u.isBlocked)} disabled={savingId === u._id} className="text-red-600 hover:underline">{u.isBlocked ? 'Unblock' : 'Block'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'companies' && (loading ? (
        <div>Loading companies…</div>
      ) : (
        <div className="space-y-6">
          {companies.map(company => (
            <div key={company._id} className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-gray-200">
                <div className="font-semibold text-xl">{company.companyName}</div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm">Credits: <strong>{(Number(company.creditBalance) ?? 0).toFixed(2)}</strong> {company.trialCreditsGranted != null ? ` (trial: ${(Number(company.trialCreditsGranted) ?? 0).toFixed(2)})` : ''}</span>
                  <span className={`text-sm px-2 py-0.5 rounded ${company.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{company.isBlocked ? 'Blocked' : 'Active'}</span>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="+/- credits" className="w-24 border rounded px-2 py-1" value={creditAdjust[company._id]?.amount != null ? creditAdjust[company._id].amount : ''} onChange={(e) => handleCreditAmountChange(company._id, e.target.value)} />
                    <input type="text" placeholder="Reason" className="w-28 border rounded px-2 py-1" value={creditAdjust[company._id]?.reason != null ? creditAdjust[company._id].reason : ''} onChange={(e) => handleCreditReasonChange(company._id, e.target.value)} />
                    <button onClick={() => handleAdjustCredits(company._id)} disabled={savingId === company._id} className="bg-indigo-600 text-white px-2 py-1 rounded text-sm">Apply</button>
                  </div>
                  <button onClick={() => handleBlock(null, company._id, !company.isBlocked)} disabled={savingId === company._id} className={`px-2 py-1 rounded text-sm ${company.isBlocked ? 'bg-green-600' : 'bg-red-600'} text-white`}>{company.isBlocked ? 'Unblock' : 'Block'}</button>
                </div>
              </div>
              <div className="space-y-4">
                {featureFlagGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-700 mb-2">{group.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {group.flags.map(flag => (
                        <label key={flag.key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={!!company.featureFlags?.[flag.key]}
                            onChange={(e) => toggleFlag(company._id, { ...(company.featureFlags || {}), [flag.key]: e.target.checked })}
                            disabled={savingId === company._id}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">{flag.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AdminPortal;


