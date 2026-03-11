import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'react-toastify';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function AdminPricing() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('packs');
  const [packs, setPacks] = useState([]);
  const [offers, setOffers] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createPack, setCreatePack] = useState({ packId: '', name: '', credits: '', price: '', currency: 'INR', popular: false, isActive: true, sortOrder: 0 });
  const [editingPack, setEditingPack] = useState(null); // { _id, packId, name, credits, price, currency, popular, isActive, sortOrder }
  const [createOffer, setCreateOffer] = useState({ title: '', description: '', discountType: 'percentage', discountValue: '', validFrom: '', validTo: '', packIds: '', isActive: true, sortOrder: 0 });
  const [createPromo, setCreatePromo] = useState({ code: '', description: '', discountType: 'percentage', discountValue: '', validFrom: '', validTo: '', maxTotalUses: 0, maxUsesPerCompany: 1, packIds: '', isActive: true });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) try { setUser(JSON.parse(u)); } catch {}
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMINISTRATOR') return;
    setLoading(true);
    Promise.all([
      axios.get('/api/admin/packs', { headers: headers() }).then((r) => setPacks(r.data?.packs || [])).catch(() => setPacks([])),
      axios.get('/api/admin/offers', { headers: headers() }).then((r) => setOffers(r.data?.offers || [])).catch(() => setOffers([])),
      axios.get('/api/admin/promos', { headers: headers() }).then((r) => setPromos(r.data?.promos || [])).catch(() => setPromos([])),
    ]).finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'ADMINISTRATOR') {
    return (
      <div className="p-8">
        <p>Administrator only.</p>
        <Link href="/admin" className="text-indigo-600 underline">Back to Admin</Link>
      </div>
    );
  }

  const handleCreatePack = async (e) => {
    e.preventDefault();
    if (!createPack.packId || !createPack.name || !createPack.credits || !createPack.price) return toast.warn('Fill packId, name, credits, price');
    setSaving(true);
    try {
      const { data } = await axios.post('/api/admin/packs', {
        packId: createPack.packId.trim(),
        name: createPack.name.trim(),
        credits: Number(createPack.credits),
        price: Number(createPack.price),
        currency: createPack.currency || 'INR',
        popular: createPack.popular,
        isActive: createPack.isActive,
        sortOrder: Number(createPack.sortOrder) || 0,
      }, { headers: headers() });
      setPacks((prev) => [...prev.filter((p) => p._id !== data._id), data]);
      setCreatePack({ packId: '', name: '', credits: '', price: '', currency: 'INR', popular: false, isActive: true, sortOrder: 0 });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPack = (pack) => {
    setEditingPack({
      _id: pack._id,
      packId: pack.packId || '',
      name: pack.name || '',
      credits: pack.credits ?? '',
      price: pack.price ?? '',
      currency: pack.currency || 'INR',
      popular: !!pack.popular,
      isActive: pack.isActive !== false,
      sortOrder: pack.sortOrder ?? 0,
    });
  };

  const handleUpdatePack = async (e) => {
    e.preventDefault();
    if (!editingPack?._id) return;
    if (!editingPack.name || editingPack.credits === '' || editingPack.price === '') {
      toast.warn('Fill name, credits, and price');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/admin/packs/${editingPack._id}`, {
        name: editingPack.name.trim(),
        credits: Number(editingPack.credits),
        price: Number(editingPack.price),
        currency: editingPack.currency || 'INR',
        popular: editingPack.popular,
        isActive: editingPack.isActive,
        sortOrder: Number(editingPack.sortOrder) || 0,
      }, { headers: headers() });
      setPacks((prev) => prev.map((p) => (p._id === data._id ? data : p)));
      setEditingPack(null);
      toast.success('Pack updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePack = async (id) => {
    if (!id || !confirm('Delete this pack?')) return;
    setSaving(true);
    try {
      await axios.delete(`/api/admin/packs/${id}`, { headers: headers() });
      setPacks((prev) => prev.filter((p) => p._id !== id));
      toast.success('Pack deleted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!createOffer.title || createOffer.discountValue === '' || !createOffer.validFrom || !createOffer.validTo) return toast.warn('Fill title, discount value, valid from/to');
    setSaving(true);
    try {
      const packIds = createOffer.packIds ? createOffer.packIds.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const { data } = await axios.post('/api/admin/offers', {
        ...createOffer,
        discountValue: Number(createOffer.discountValue),
        validFrom: new Date(createOffer.validFrom).toISOString(),
        validTo: new Date(createOffer.validTo).toISOString(),
        packIds,
        sortOrder: Number(createOffer.sortOrder) || 0,
      }, { headers: headers() });
      setOffers((prev) => [...prev, data]);
      setCreateOffer({ title: '', description: '', discountType: 'percentage', discountValue: '', validFrom: '', validTo: '', packIds: '', isActive: true, sortOrder: 0 });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!id || !confirm('Delete this offer?')) return;
    setSaving(true);
    try {
      await axios.delete(`/api/admin/offers/${id}`, { headers: headers() });
      setOffers((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!createPromo.code || createPromo.discountValue === '' || !createPromo.validFrom || !createPromo.validTo) return toast.warn('Fill code, discount value, valid from/to');
    setSaving(true);
    try {
      const packIds = createPromo.packIds ? createPromo.packIds.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const { data } = await axios.post('/api/admin/promos', {
        ...createPromo,
        discountValue: Number(createPromo.discountValue),
        validFrom: new Date(createPromo.validFrom).toISOString(),
        validTo: new Date(createPromo.validTo).toISOString(),
        packIds,
        maxTotalUses: Number(createPromo.maxTotalUses) || 0,
        maxUsesPerCompany: Number(createPromo.maxUsesPerCompany) ?? 1,
      }, { headers: headers() });
      setPromos((prev) => [...prev, data]);
      setCreatePromo({ code: '', description: '', discountType: 'percentage', discountValue: '', validFrom: '', validTo: '', maxTotalUses: 0, maxUsesPerCompany: 1, packIds: '', isActive: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async (id) => {
    if (!id || !confirm('Delete this promo?')) return;
    setSaving(true);
    try {
      await axios.delete(`/api/admin/promos/${id}`, { headers: headers() });
      setPromos((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-indigo-600 hover:underline font-medium">← Admin</Link>
          <h1 className="text-2xl font-bold text-gray-900">Pricing &amp; Offers</h1>
        </div>

        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button onClick={() => setTab('packs')} className={`px-4 py-2 rounded-t ${tab === 'packs' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Packs</button>
          <button onClick={() => setTab('offers')} className={`px-4 py-2 rounded-t ${tab === 'offers' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Offers</button>
          <button onClick={() => setTab('promos')} className={`px-4 py-2 rounded-t ${tab === 'promos' ? 'bg-white border border-b-0' : 'bg-gray-100'}`}>Promo codes</button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            {tab === 'packs' && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-lg mb-4">Credit packs</h2>
                <p className="text-sm text-gray-600 mb-4">When no packs exist in DB, the pricing page uses default packs from config. Create packs here to override.</p>
                {editingPack && (
                  <form onSubmit={handleUpdatePack} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h3 className="col-span-2 md:col-span-4 font-medium text-gray-900">Edit plan</h3>
                    <input readOnly placeholder="Pack ID" value={editingPack.packId} className="border rounded px-3 py-2 bg-gray-100 text-gray-600" title="Pack ID cannot be changed" />
                    <input placeholder="Name" value={editingPack.name} onChange={(e) => setEditingPack((p) => ({ ...p, name: e.target.value }))} className="border rounded px-3 py-2" required />
                    <input type="number" placeholder="Credits" value={editingPack.credits} onChange={(e) => setEditingPack((p) => ({ ...p, credits: e.target.value }))} className="border rounded px-3 py-2" required />
                    <input type="number" step="0.01" placeholder="Price" value={editingPack.price} onChange={(e) => setEditingPack((p) => ({ ...p, price: e.target.value }))} className="border rounded px-3 py-2" required />
                    <select value={editingPack.currency} onChange={(e) => setEditingPack((p) => ({ ...p, currency: e.target.value }))} className="border rounded px-3 py-2">
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                    <input type="number" placeholder="Sort order" value={editingPack.sortOrder} onChange={(e) => setEditingPack((p) => ({ ...p, sortOrder: e.target.value }))} className="border rounded px-3 py-2" />
                    <label className="flex items-center gap-2 col-span-2">
                      <input type="checkbox" checked={editingPack.popular} onChange={(e) => setEditingPack((p) => ({ ...p, popular: e.target.checked }))} />
                      <span>Popular</span>
                    </label>
                    <label className="flex items-center gap-2 col-span-2">
                      <input type="checkbox" checked={editingPack.isActive} onChange={(e) => setEditingPack((p) => ({ ...p, isActive: e.target.checked }))} />
                      <span>Active</span>
                    </label>
                    <div className="col-span-2 flex gap-2">
                      <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Save</button>
                      <button type="button" onClick={() => setEditingPack(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Cancel</button>
                    </div>
                  </form>
                )}
                <form onSubmit={handleCreatePack} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                  <input placeholder="Pack ID (e.g. pack_100)" value={createPack.packId} onChange={(e) => setCreatePack((p) => ({ ...p, packId: e.target.value }))} className="border rounded px-3 py-2" required />
                  <input placeholder="Name" value={createPack.name} onChange={(e) => setCreatePack((p) => ({ ...p, name: e.target.value }))} className="border rounded px-3 py-2" required />
                  <input type="number" placeholder="Credits" value={createPack.credits} onChange={(e) => setCreatePack((p) => ({ ...p, credits: e.target.value }))} className="border rounded px-3 py-2" required />
                  <input type="number" step="0.01" placeholder="Price" value={createPack.price} onChange={(e) => setCreatePack((p) => ({ ...p, price: e.target.value }))} className="border rounded px-3 py-2" required />
                  <label className="flex items-center gap-2 col-span-2">
                    <input type="checkbox" checked={createPack.popular} onChange={(e) => setCreatePack((p) => ({ ...p, popular: e.target.checked }))} />
                    <span>Popular</span>
                  </label>
                  <label className="flex items-center gap-2 col-span-2">
                    <input type="checkbox" checked={createPack.isActive} onChange={(e) => setCreatePack((p) => ({ ...p, isActive: e.target.checked }))} />
                    <span>Active</span>
                  </label>
                  <button type="submit" disabled={saving} className="col-span-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Add pack</button>
                </form>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2">Pack ID</th><th className="text-left py-2">Name</th><th className="text-left py-2">Credits</th><th className="text-left py-2">Price</th><th className="text-left py-2">Popular</th><th className="text-left py-2">Active</th><th className="text-left py-2">Actions</th></tr></thead>
                  <tbody>
                    {packs.map((p) => (
                      <tr key={p._id || p.packId} className="border-b">
                        <td className="py-2">{p.packId}</td>
                        <td>{p.name}</td>
                        <td>{p.credits}</td>
                        <td>{p.currency === 'INR' ? '₹' : '$'}{p.price}</td>
                        <td>{p.popular ? 'Yes' : 'No'}</td>
                        <td>{p.isActive !== false ? 'Yes' : 'No'}</td>
                        <td>
                          {p._id ? (
                            <span className="flex gap-2">
                              <button type="button" onClick={() => handleEditPack(p)} className="text-indigo-600 hover:underline">Edit</button>
                              <button type="button" onClick={() => handleDeletePack(p._id)} className="text-red-600 hover:underline">Delete</button>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'offers' && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-lg mb-4">Offers (auto-applied, time-bound)</h2>
                <form onSubmit={handleCreateOffer} className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg max-w-2xl">
                  <input placeholder="Title" value={createOffer.title} onChange={(e) => setCreateOffer((p) => ({ ...p, title: e.target.value }))} className="w-full border rounded px-3 py-2" required />
                  <div className="flex gap-4">
                    <select value={createOffer.discountType} onChange={(e) => setCreateOffer((p) => ({ ...p, discountType: e.target.value }))} className="border rounded px-3 py-2">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                    <input type="number" step="0.01" placeholder="Value (e.g. 20 for 20%)" value={createOffer.discountValue} onChange={(e) => setCreateOffer((p) => ({ ...p, discountValue: e.target.value }))} className="border rounded px-3 py-2 flex-1" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="datetime-local" placeholder="Valid from" value={createOffer.validFrom} onChange={(e) => setCreateOffer((p) => ({ ...p, validFrom: e.target.value }))} className="border rounded px-3 py-2" required />
                    <input type="datetime-local" placeholder="Valid to" value={createOffer.validTo} onChange={(e) => setCreateOffer((p) => ({ ...p, validTo: e.target.value }))} className="border rounded px-3 py-2" required />
                  </div>
                  <input placeholder="Pack IDs (comma-separated, empty = all)" value={createOffer.packIds} onChange={(e) => setCreateOffer((p) => ({ ...p, packIds: e.target.value }))} className="w-full border rounded px-3 py-2" />
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Add offer</button>
                </form>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2">Title</th><th className="text-left py-2">Discount</th><th className="text-left py-2">Valid to</th><th className="text-left py-2">Actions</th></tr></thead>
                  <tbody>
                    {offers.map((o) => (
                      <tr key={o._id} className="border-b">
                        <td className="py-2">{o.title}</td>
                        <td>{o.discountType === 'percentage' ? `${o.discountValue}%` : `₹${o.discountValue}`}</td>
                        <td>{new Date(o.validTo).toLocaleString()}</td>
                        <td><button type="button" onClick={() => handleDeleteOffer(o._id)} className="text-red-600 hover:underline">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'promos' && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-lg mb-4">Promo codes (user enters code; limits per company)</h2>
                <form onSubmit={handleCreatePromo} className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg max-w-2xl">
                  <input placeholder="Code (e.g. SAVE20)" value={createPromo.code} onChange={(e) => setCreatePromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))} className="w-full border rounded px-3 py-2 uppercase" required />
                  <div className="flex gap-4">
                    <select value={createPromo.discountType} onChange={(e) => setCreatePromo((p) => ({ ...p, discountType: e.target.value }))} className="border rounded px-3 py-2">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                    <input type="number" step="0.01" placeholder="Value" value={createPromo.discountValue} onChange={(e) => setCreatePromo((p) => ({ ...p, discountValue: e.target.value }))} className="border rounded px-3 py-2 flex-1" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="datetime-local" value={createPromo.validFrom} onChange={(e) => setCreatePromo((p) => ({ ...p, validFrom: e.target.value }))} className="border rounded px-3 py-2" required />
                    <input type="datetime-local" value={createPromo.validTo} onChange={(e) => setCreatePromo((p) => ({ ...p, validTo: e.target.value }))} className="border rounded px-3 py-2" required />
                  </div>
                  <div className="flex gap-4">
                    <input type="number" min="0" placeholder="Max total uses (0 = unlimited)" value={createPromo.maxTotalUses} onChange={(e) => setCreatePromo((p) => ({ ...p, maxTotalUses: e.target.value }))} className="border rounded px-3 py-2" />
                    <input type="number" min="0" placeholder="Max uses per company" value={createPromo.maxUsesPerCompany} onChange={(e) => setCreatePromo((p) => ({ ...p, maxUsesPerCompany: e.target.value }))} className="border rounded px-3 py-2" />
                  </div>
                  <input placeholder="Pack IDs (comma-separated, empty = all)" value={createPromo.packIds} onChange={(e) => setCreatePromo((p) => ({ ...p, packIds: e.target.value }))} className="w-full border rounded px-3 py-2" />
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Add promo code</button>
                </form>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2">Code</th><th className="text-left py-2">Discount</th><th className="text-left py-2">Max/company</th><th className="text-left py-2">Used</th><th className="text-left py-2">Valid to</th><th className="text-left py-2">Actions</th></tr></thead>
                  <tbody>
                    {promos.map((p) => (
                      <tr key={p._id} className="border-b">
                        <td className="py-2 font-mono">{p.code}</td>
                        <td>{p.discountType === 'percentage' ? `${p.discountValue}%` : `₹${p.discountValue}`}</td>
                        <td>{p.maxUsesPerCompany || '∞'}</td>
                        <td>{p.totalUsed ?? 0}</td>
                        <td>{new Date(p.validTo).toLocaleString()}</td>
                        <td><button type="button" onClick={() => handleDeletePromo(p._id)} className="text-red-600 hover:underline">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
