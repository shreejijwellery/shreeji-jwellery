import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function SkuManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('');
  
  // SKU Management states
  const [skuMappings, setSkuMappings] = useState([]);
  const [allSkuMappings, setAllSkuMappings] = useState([]); // For infinite scroll
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [skuMappingFile, setSkuMappingFile] = useState(null);
  const [skuUploadLoading, setSkuUploadLoading] = useState(false);
  const [editingSkuId, setEditingSkuId] = useState(null);
  const [editFormData, setEditFormData] = useState({ sku: '', origin: '', companyName: '' });
  
  // New states for features
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [skuToDelete, setSkuToDelete] = useState(null);
  const [newSkuData, setNewSkuData] = useState({ sku: '', origin: '', companyName: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  const ITEMS_PER_PAGE = 50;

  // Fetch SKU mappings
  const fetchSkuMappings = async (search = '', append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const token = localStorage.getItem('token');
      const url = search 
        ? `/api/sku-mapping?search=${encodeURIComponent(search)}&limit=10000`
        : '/api/sku-mapping?limit=10000';
      
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAllSkuMappings(data.data || []);
      setPage(1);
      setHasMore(true);
    } catch (err) {
      console.error('Failed to fetch SKU mappings:', err);
      setError(err.response?.data?.message || 'Failed to load SKU mappings');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Sort data
  const sortedMappings = useCallback(() => {
    const sorted = [...allSkuMappings].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (sortConfig.direction === 'asc') {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });
    return sorted;
  }, [allSkuMappings, sortConfig]);

  // Get paginated data
  const paginatedMappings = useCallback(() => {
    const sorted = sortedMappings();
    return sorted.slice(0, page * ITEMS_PER_PAGE);
  }, [sortedMappings, page]);

  // Update displayed mappings when data changes
  useEffect(() => {
    const paginated = paginatedMappings();
    setSkuMappings(paginated);
    setHasMore(paginated.length < allSkuMappings.length);
  }, [paginatedMappings, allSkuMappings.length]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSkuMappingUpload = async () => {
    if (!skuMappingFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setSkuUploadLoading(true);
      setError(null);
      setSuccess(false);
      setStatus('Reading file...');

      // Parse file on client side
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            resolve(jsonData);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(skuMappingFile);
      });

      if (!data || data.length === 0) {
        throw new Error('File is empty or could not be parsed');
      }

      const totalRecords = data.length;
      const CHUNK_SIZE = 500;
      const totalChunks = Math.ceil(totalRecords / CHUNK_SIZE);
      
      let totalInserted = 0;
      let totalUpdated = 0;
      const token = localStorage.getItem('token');

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalRecords);
        const chunk = data.slice(start, end);

        setStatus(`Uploading batch ${i + 1} of ${totalChunks} (${start + 1}-${end} of ${totalRecords})...`);

        try {
          const response = await axios.post('/api/sku-mapping', { data: chunk }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          totalInserted += response.data.inserted || 0;
          totalUpdated += response.data.updated || 0;
        } catch (chunkError) {
          console.error(`Error uploading batch ${i + 1}:`, chunkError);
          throw new Error(`Failed at batch ${i + 1}: ${chunkError.response?.data?.message || chunkError.message}`);
        }
      }

      setSuccess(true);
      setStatus(`Upload complete: ${totalInserted} inserted, ${totalUpdated} updated`);
      setSkuMappingFile(null);
      setShowUploadModal(false);
      
      // Refresh the list
      await fetchSkuMappings(skuSearchTerm);
      
      setTimeout(() => { setSuccess(false); setStatus(''); }, 5000);
    } catch (err) {
      console.error('Failed to upload SKU mappings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload file');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSkuUploadLoading(false);
    }
  };

  const handleAddSku = async () => {
    if (!newSkuData.sku || !newSkuData.origin || !newSkuData.companyName) {
      setError('All fields are required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put('/api/sku-mapping', newSkuData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setStatus('SKU added successfully');
      setNewSkuData({ sku: '', origin: '', companyName: '' });
      setShowAddModal(false);
      
      // Refresh the list
      await fetchSkuMappings(skuSearchTerm);
      
      setTimeout(() => { setSuccess(false); setStatus(''); }, 3000);
    } catch (err) {
      console.error('Failed to add SKU:', err);
      setError(err.response?.data?.message || 'Failed to add SKU');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSku = (sku) => {
    setSkuToDelete(sku);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!skuToDelete) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/sku-mapping?sku=${encodeURIComponent(skuToDelete)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setStatus('SKU deleted successfully');
      setShowDeleteModal(false);
      setSkuToDelete(null);
      
      // Refresh the list
      await fetchSkuMappings(skuSearchTerm);
      
      setTimeout(() => { setSuccess(false); setStatus(''); }, 3000);
    } catch (err) {
      console.error('Failed to delete SKU:', err);
      setError(err.response?.data?.message || 'Failed to delete SKU');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSku = (mapping) => {
    setEditingSkuId(mapping._id);
    setEditFormData({
      sku: mapping.sku,
      origin: mapping.origin,
      companyName: mapping.companyName
    });
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put('/api/sku-mapping', { ...editFormData, id: editingSkuId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setStatus('SKU updated successfully');
      setEditingSkuId(null);
      setEditFormData({ sku: '', origin: '', companyName: '' });
      
      // Refresh the list
      await fetchSkuMappings(skuSearchTerm);
      
      setTimeout(() => { setSuccess(false); setStatus(''); }, 3000);
    } catch (err) {
      console.error('Failed to update SKU:', err);
      setError(err.response?.data?.message || 'Failed to update SKU');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSkuId(null);
    setEditFormData({ sku: '', origin: '', companyName: '' });
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchSkuMappings();
  }, []);

  // Search with debounce
  useEffect(() => {
    if (skuSearchTerm) {
      const timer = setTimeout(() => {
        fetchSkuMappings(skuSearchTerm);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      fetchSkuMappings();
    }
  }, [skuSearchTerm]);

  // Sort icon component
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="p-8">
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md shadow-sm">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700">{status || 'Success!'}</p>
          </div>
        </div>
      )}

      {/* Header with Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">SKU Management</h2>
          <p className="text-sm text-gray-600">
            Manage your SKU mappings for origin and company name.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add SKU
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload File
          </button>
        </div>
      </div>

      {/* Search and Table Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by SKU, Origin, or Company name..."
              value={skuSearchTerm}
              onChange={(e) => setSkuSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Showing <strong>{skuMappings.length}</strong> of <strong>{allSkuMappings.length}</strong> entries
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {loading && allSkuMappings.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-600">Loading SKU mappings...</p>
            </div>
          ) : allSkuMappings.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600 text-lg font-medium mb-2">No SKU mappings found</p>
              <p className="text-gray-500 text-sm mb-4">Upload a CSV/Excel file or add SKUs manually to get started</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Your First SKU
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Upload File
                </button>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center gap-2">
                      SKU
                      <SortIcon column="sku" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('origin')}
                  >
                    <div className="flex items-center gap-2">
                      Origin
                      <SortIcon column="origin" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('companyName')}
                  >
                    <div className="flex items-center gap-2">
                      Company Name
                      <SortIcon column="companyName" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {skuMappings.map((mapping) => (
                  <tr key={mapping._id} className="hover:bg-gray-50 transition-colors">
                    {editingSkuId === mapping._id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editFormData.sku}
                            onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 bg-gray-100"
                            disabled
                            title="SKU cannot be changed"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editFormData.origin}
                            onChange={(e) => setEditFormData({ ...editFormData, origin: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editFormData.companyName}
                            onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Save"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title="Cancel"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {mapping.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {mapping.origin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {mapping.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditSku(mapping)}
                            className="text-purple-600 hover:text-purple-900 mr-3"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSku(mapping.sku)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* Infinite scroll trigger */}
          {hasMore && allSkuMappings.length > 0 && (
            <div ref={observerTarget} className="p-4 text-center">
              {isLoadingMore && (
                <svg className="animate-spin h-6 w-6 text-purple-600 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Upload SKU Mapping File</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSkuMappingFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV or Excel file with columns: <strong>SKU</strong>, <strong>Origin</strong>, <strong>Company name</strong>
                </p>
                
                <div className={`relative border-2 border-dashed rounded-lg transition-colors ${
                  skuMappingFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-purple-400 bg-white'
                }`}>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setSkuMappingFile(file || null);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="px-6 py-8 text-center">
                    {skuMappingFile ? (
                      <>
                        <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm font-semibold text-green-800 mb-1">{skuMappingFile.name}</div>
                        <div className="text-xs text-green-700">
                          {(skuMappingFile.size / 1024).toFixed(2)} KB
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="text-sm text-gray-700 font-medium mb-1">Click to browse or drag file here</div>
                        <div className="text-xs text-gray-500">CSV or Excel (XLSX/XLS)</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkuMappingUpload}
                  disabled={!skuMappingFile || skuUploadLoading}
                  className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {skuUploadLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload File
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSkuMappingFile(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add SKU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Add New SKU</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSkuData({ sku: '', origin: '', companyName: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={newSkuData.sku}
                    onChange={(e) => setNewSkuData({ ...newSkuData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                  <input
                    type="text"
                    value={newSkuData.origin}
                    onChange={(e) => setNewSkuData({ ...newSkuData, origin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter Origin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={newSkuData.companyName}
                    onChange={(e) => setNewSkuData({ ...newSkuData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter Company Name"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddSku}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Adding...' : 'Add SKU'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSkuData({ sku: '', origin: '', companyName: '' });
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Confirm Deletion</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSkuToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-center text-gray-600">
                  Are you sure you want to delete SKU: <strong>{skuToDelete}</strong>?
                  <br />
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Deleting...' : 'Delete SKU'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSkuToDelete(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
