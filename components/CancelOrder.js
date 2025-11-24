import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function CancelOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [emailMappings, setEmailMappings] = useState([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [unmappedEmails, setUnmappedEmails] = useState(new Set());
  const [uploadStartDate, setUploadStartDate] = useState(''); // Start date for upload range
  const [uploadEndDate, setUploadEndDate] = useState(''); // End date for upload range
  const [uploadedDates, setUploadedDates] = useState(new Set()); // Set of uploaded date strings
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, message: '' });
  const [holidays, setHolidays] = useState(new Set()); // Set of holiday date strings (YYYY-MM-DD)
  const [markAsHoliday, setMarkAsHoliday] = useState(false); // For upload modal
  
  // View/Display states
  const [viewData, setViewData] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterSKU, setFilterSKU] = useState('');
  const [dateRange, setDateRange] = useState({ min: '', max: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDate, setDeleteDate] = useState('');

  // Fetch email mappings on component mount
  useEffect(() => {
    fetchEmailMappings();
    fetchUploadedDates();
    initializeView();
  }, []);

  // Auto-fetch data when filters change
  useEffect(() => {
    if (filterStartDate || filterEndDate) {
      const timer = setTimeout(() => {
        fetchCancelledOrders();
      }, 300); // Debounce for 300ms
      return () => clearTimeout(timer);
    }
  }, [filterStartDate, filterEndDate, filterCompany, filterSKU]);

  // Fetch holidays when date range changes
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!filterStartDate || !filterEndDate) return;
      
      try {
        const token = localStorage.getItem('token');
        const cleanStartDate = filterStartDate.split('T')[0];
        const cleanEndDate = filterEndDate.split('T')[0];
        const { data } = await axios.get(
          `/api/sku-inventory/holidays?startDate=${cleanStartDate}&endDate=${cleanEndDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success && data.holidays) {
          setHolidays(new Set(data.holidays));
        }
      } catch (err) {
        console.error('Error fetching holidays:', err);
        setHolidays(new Set());
      }
    };
    fetchHolidays();
  }, [filterStartDate, filterEndDate]);

  const fetchEmailMappings = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/company-email-mapping', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setEmailMappings(data.mappings || []);
      }
    } catch (err) {
      console.error('Error fetching email mappings:', err);
    }
  };

  const fetchUploadedDates = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/cancelled-orders?startDate=2020-01-01&endDate=2099-12-31', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success && data.orders) {
        const dates = new Set();
        const dateStrings = [];
        
        // Helper to convert Date to local date string (YYYY-MM-DD)
        const toLocalDateString = (date) => {
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        data.orders.forEach(order => {
          if (order.startDate && order.endDate) {
            // New schema: Add all dates in the range using local timezone
            const startStr = toLocalDateString(order.startDate);
            const endStr = toLocalDateString(order.endDate);
            const range = generateDateRange(startStr, endStr);
            range.forEach(dateStr => {
              dates.add(dateStr);
              dateStrings.push(dateStr);
            });
          } else if (order.selectedDate) {
            // Old schema: Single date using local timezone
            const dateStr = toLocalDateString(order.selectedDate);
            dates.add(dateStr);
            dateStrings.push(dateStr);
          }
        });
        setUploadedDates(dates);
        
        // Set date range
        if (dateStrings.length > 0) {
          const sortedDates = [...dateStrings].sort();
          setDateRange({ min: sortedDates[0], max: sortedDates[sortedDates.length - 1] });
        }
      }
    } catch (err) {
      console.error('Error fetching uploaded dates:', err);
    }
  };

  const initializeView = () => {
    // Set default to current month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    setFilterStartDate(firstDayStr);
    setFilterEndDate(lastDayStr);
  };

  const fetchCancelledOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterCompany) params.append('companyName', filterCompany);
      if (filterSKU) params.append('sku', filterSKU);

      const { data } = await axios.get(`/api/cancelled-orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (data.success) {
        // Group data by company and SKU
        const grouped = {};
        data.orders.forEach(order => {
          const key = `${order.companyName}|||${order.sku}`;
          if (!grouped[key]) {
            grouped[key] = {
              companyName: order.companyName,
              sku: order.sku,
              segments: []
            };
          }
          
          // Normalize date range
          let startStr, endStr;
          if (order.startDate && order.endDate) {
            const start = new Date(order.startDate);
            const end = new Date(order.endDate);
            startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
          } else if (order.selectedDate) {
            const date = new Date(order.selectedDate);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            startStr = dateStr;
            endStr = dateStr;
          }

          if (startStr && endStr) {
            grouped[key].segments.push({
              start: startStr,
              end: endStr,
              quantity: order.quantity || 0,
              originalQuantity: order.quantity || 0 // Track original quantity for merging logic
            });
          }
        });
        
        // Process each group to merge adjacent/overlapping ranges
        let finalViewData = [];
        
        Object.values(grouped).forEach(item => {
          // Sort segments by start date
          const sortedSegments = item.segments.sort((a, b) => a.start.localeCompare(b.start));
          
          const mergedSegments = [];
          let currentSegment = null;
          
          sortedSegments.forEach(segment => {
            if (!currentSegment) {
              currentSegment = { ...segment };
            } else {
              // Check if adjacent or overlapping AND has same original quantity
              // Calculate end date + 1 day for adjacency check
              const currentEnd = new Date(currentSegment.end);
              const nextDay = new Date(currentEnd);
              nextDay.setDate(nextDay.getDate() + 1);
              const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
              
              if (segment.start <= nextDayStr && segment.originalQuantity === currentSegment.originalQuantity) {
                // Merge
                currentSegment.end = segment.end > currentSegment.end ? segment.end : currentSegment.end;
                currentSegment.quantity += segment.quantity;
              } else {
                // Push current and start new
                mergedSegments.push(currentSegment);
                currentSegment = { ...segment };
              }
            }
          });
          
          if (currentSegment) {
            mergedSegments.push(currentSegment);
          }
          
          // Create view items for each merged segment
          mergedSegments.forEach(segment => {
            finalViewData.push({
              companyName: item.companyName,
              sku: item.sku,
              quantity: segment.quantity,
              dateRange: segment.start === segment.end ? formatDate(segment.start) : `${formatDate(segment.start)} - ${formatDate(segment.end)}`,
              rawStartDate: segment.start // For sorting
            });
          });
        });
        
        // Sort by Date, then Company, then SKU
        finalViewData.sort((a, b) => {
          if (a.rawStartDate !== b.rawStartDate) {
            return a.rawStartDate.localeCompare(b.rawStartDate);
          }
          if (a.companyName !== b.companyName) {
            return a.companyName.localeCompare(b.companyName);
          }
          return a.sku.localeCompare(b.sku);
        });
        
        setViewData(finalViewData);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching cancelled orders:', err);
      setError(err.response?.data?.message || 'Failed to fetch cancelled orders');
      setViewData([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCancelledOrdersByDate = async () => {
    if (!deleteDate) {
      setError('Please select a date');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.delete('/api/cancelled-orders', {
        data: { startDate: deleteDate, endDate: deleteDate },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(true);
      setStatus(data.message);
      setShowDeleteModal(false);
      setDeleteDate('');
      
      // Refresh data
      await fetchUploadedDates();
      await fetchCancelledOrders();
      
      setTimeout(() => {
        setSuccess(false);
        setStatus('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete cancelled orders');
    } finally {
      setLoading(false);
    }
  };

  const generateDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const dates = [];
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    const current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const findHeaderKeyInsensitive = (row, target) => {
    const keys = Object.keys(row || {});
    const match = keys.find(k => (k || '').trim().toUpperCase() === target.toUpperCase());
    return match;
  };

  const handleFileUpload = async (event, fileOverride = null) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    setStatus('Reading Excel file...');

    try {
      // Get file from parameter, selectedFile state, or from event
      let file = fileOverride || selectedFile;
      if (!file && event?.target) {
        // Check if it's a form event with excel_file input
        if (event.target.excel_file?.files?.[0]) {
          file = event.target.excel_file.files[0];
        } 
        // Check if it's a direct file input event
        else if (event.target.files?.[0]) {
          file = event.target.files[0];
        }
      }
      
      if (!file) {
        throw new Error('Please select an Excel file');
      }
      
      // Update selectedFile state if we got file from event
      if (!selectedFile && file) {
        setSelectedFile(file);
      }

      setStatus('Parsing Excel file...');
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet);

      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }

      setStatus('Extracting data...');
      
      // Find column headers (case-insensitive)
      const firstRow = data[0];
      const styleIdKey = findHeaderKeyInsensitive(firstRow, 'Style Id') || findHeaderKeyInsensitive(firstRow, 'SKU');
      const quantityKey = findHeaderKeyInsensitive(firstRow, 'Quantity');
      const companyKey = findHeaderKeyInsensitive(firstRow, 'Company');

      if (!styleIdKey || !quantityKey || !companyKey) {
        throw new Error('Required columns not found. Please ensure the Excel has: Style Id, Quantity, and Company columns');
      }

      // Extract data
      const extracted = [];
      const emails = new Set();

      data.forEach((row, index) => {
        const styleId = String(row[styleIdKey] || '').trim();
        const quantity = Number(row[quantityKey]) || 0;
        const email = String(row[companyKey] || '').trim().toLowerCase();

        if (styleId && quantity > 0 && email) {
          extracted.push({
            sku: styleId,
            quantity,
            email,
            rowIndex: index + 2 // +2 because Excel rows start at 1 and we skip header
          });
          emails.add(email);
        }
      });

      if (extracted.length === 0) {
        throw new Error('No valid data found in Excel file');
      }

      setExtractedData(extracted);
      
      // Check for unmapped emails
      const mappedEmails = new Set(emailMappings.map(m => m.email.toLowerCase()));
      const unmapped = new Set([...emails].filter(email => !mappedEmails.has(email.toLowerCase())));
      setUnmappedEmails(unmapped);

      setStatus(`Extracted ${extracted.length} orders from ${emails.size} unique emails`);
      
      if (unmapped.size > 0) {
        setError(`Found ${unmapped.size} unmapped email(s). Please map them before uploading.`);
      } else {
        setSuccess(true);
        setStatus('All emails are mapped. Ready to upload.');
        // Open upload modal to select dates
        setShowUploadModal(true);
      }
    } catch (err) {
      console.error('Excel processing error:', err);
      setError(err.message || 'Failed to process Excel file');
      setStatus('');
      setExtractedData([]);
    } finally {
      setLoading(false);
    }
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const getCompanyNameForEmail = (email) => {
    const mapping = emailMappings.find(m => m.email.toLowerCase() === email.toLowerCase());
    return mapping ? mapping.companyName : null;
  };

  const getCurrentMonthRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    return { firstDay: firstDayStr, lastDay: lastDayStr };
  };

  const handleSaveMapping = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!newCompanyName.trim() || !newEmail.trim()) {
        setError('Company name and email are required');
        return;
      }

      if (editingMapping) {
        // Update existing mapping
        await axios.put(
          '/api/company-email-mapping',
          {
            id: editingMapping._id,
            companyName: newCompanyName.trim(),
            email: newEmail.trim().toLowerCase(),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new mapping
        await axios.post(
          '/api/company-email-mapping',
          {
            companyName: newCompanyName.trim(),
            email: newEmail.trim().toLowerCase(),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchEmailMappings();
      setShowMappingModal(false);
      setEditingMapping(null);
      setNewCompanyName('');
      setNewEmail('');
      setSuccess(true);
      setStatus('Mapping saved successfully');
      setTimeout(() => {
        setSuccess(false);
        setStatus('');
      }, 3000);

      // Re-check unmapped emails
      if (extractedData.length > 0) {
        const emails = new Set(extractedData.map(d => d.email.toLowerCase()));
        const mappedEmails = new Set(emailMappings.map(m => m.email.toLowerCase()));
        const unmapped = new Set([...emails].filter(email => !mappedEmails.has(email.toLowerCase())));
        setUnmappedEmails(unmapped);
      }
    } catch (err) {
      console.error('Error saving mapping:', err);
      setError(err.response?.data?.message || 'Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete('/api/company-email-mapping', {
        data: { id },
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEmailMappings();
      setSuccess(true);
      setStatus('Mapping deleted successfully');
      setTimeout(() => {
        setSuccess(false);
        setStatus('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting mapping:', err);
      setError(err.response?.data?.message || 'Failed to delete mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadToDatabase = async () => {
    if (unmappedEmails.size > 0) {
      setError(`Please map all emails before uploading. ${unmappedEmails.size} email(s) still unmapped.`);
      return;
    }

    if (!uploadStartDate || !uploadEndDate) {
      setError('Please select both start and end dates');
      return;
    }

    // Validate date range
    const start = new Date(uploadStartDate);
    const end = new Date(uploadEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start > end) {
      setError('Start date must be before or equal to end date');
      return;
    }
    
    if (start > today || end > today) {
      setError('Cannot upload data for future dates');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadProgress({ percent: 10, message: 'Preparing data...' });

      const token = localStorage.getItem('token');
      
      // Map emails to company names
      const ordersToUpload = extractedData.map(item => ({
        companyName: getCompanyNameForEmail(item.email),
        sku: item.sku,
        quantity: item.quantity,
        email: item.email,
      }));

      // Calculate number of days in range for display
      const dateRange = generateDateRange(uploadStartDate, uploadEndDate);
      setUploadProgress({ percent: 50, message: `Uploading to database for date range (${dateRange.length} days)...` });

      const { data } = await axios.post(
        '/api/cancelled-orders',
        { 
          orders: ordersToUpload,
          startDate: uploadStartDate,
          endDate: uploadEndDate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mark as holiday if checkbox was checked
      if (markAsHoliday) {
        try {
          await axios.post(
            '/api/sku-inventory/holidays',
            { date: uploadStartDate },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Refresh holidays
          if (filterStartDate && filterEndDate) {
            const { data: holidayData } = await axios.get(
              `/api/sku-inventory/holidays?startDate=${filterStartDate}&endDate=${filterEndDate}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (holidayData.success && holidayData.holidays) {
              setHolidays(new Set(holidayData.holidays));
            }
          }
        } catch (holidayErr) {
          console.error('Error marking as holiday:', holidayErr);
          // Don't fail the upload if holiday marking fails
        }
      }

      setUploadProgress({ percent: 100, message: 'Upload complete!' });

      setSuccess(true);
      setStatus(data.message || `Successfully uploaded ${data.count} cancelled orders`);
      setExtractedData([]);
      setSelectedFile(null);
      setUploadStartDate('');
      setUploadEndDate('');
      setMarkAsHoliday(false);
      setShowUploadModal(false);
      
      // Refresh uploaded dates and view data
      await fetchUploadedDates();
      await fetchCancelledOrders();
      
      setTimeout(() => {
        setSuccess(false);
        setStatus('');
        setUploadProgress({ percent: 0, message: '' });
      }, 5000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload cancelled orders');
      setStatus('');
      setUploadProgress({ percent: 0, message: '' });
    } finally {
      setLoading(false);
    }
  };

  const openMappingModal = (email = null, companyName = null) => {
    if (email && companyName) {
      // Edit existing mapping
      const mapping = emailMappings.find(m => m.email.toLowerCase() === email.toLowerCase());
      if (mapping) {
        setEditingMapping(mapping);
        setNewCompanyName(mapping.companyName);
        setNewEmail(mapping.email);
      }
    } else {
      // New mapping
      setEditingMapping(null);
      setNewCompanyName('');
      setNewEmail(email || '');
    }
    setShowMappingModal(true);
  };

  return (
    <div className="p-0">
      {/* Error Message */}
      {error && (
          <div className="m-8 mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
      )}

      {/* Success Message */}
      {success && (
          <div className="m-8 mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{status}</p>
              </div>
            </div>
          </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
          {/* Date Range Info */}
          {dateRange.min && dateRange.max && (
            <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-700">
                  Data available from <strong>{formatDate(dateRange.min)}</strong> to <strong>{formatDate(dateRange.max)}</strong>
                </span>
              </div>
              {viewData.length > 0 && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {viewData.length} orders loaded
                </span>
              )}
            </div>
          )}

          {/* Currently Showing Data */}
          {viewData.length > 0 && filterStartDate && filterEndDate && (
            <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-700">
                  Currently showing data: <strong>{formatDate(filterStartDate)}</strong> 
                  {filterStartDate !== filterEndDate && (
                    <> to <strong>{formatDate(filterEndDate)}</strong></>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                min={dateRange.min}
                max={dateRange.max}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                min={dateRange.min}
                max={dateRange.max}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Company Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                placeholder="Search Company..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* SKU Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={filterSKU}
                onChange={(e) => setFilterSKU(e.target.value)}
                placeholder="Search SKU..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Upload Button */}
            <button
              onClick={() => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.xlsx,.xls';
                fileInput.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setExtractedData([]);
                    setError(null);
                    // Pass file directly to avoid race condition with state update
                    handleFileUpload({ preventDefault: () => {} }, file);
                  }
                };
                fileInput.click();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload
            </button>

            {/* Manage Mappings Button */}
            <button
              onClick={() => openMappingModal()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Mappings
            </button>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white">
          {/* Data Table */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {!filterStartDate || !filterEndDate ? (
              <div className="text-center py-16 px-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Select Date Range</h3>
                <p className="mt-2 text-sm text-gray-500">Please select start and end dates to view cancelled orders</p>
              </div>
            ) : viewData.length === 0 ? (
              <div className="text-center py-16 px-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Data Found</h3>
                <p className="mt-2 text-sm text-gray-500">No cancelled orders found for the selected date range</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {viewData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.dateRange}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.companyName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.quantity.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {viewData.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
      </div>

      {/* Extracted Data Preview Modal */}
      {extractedData.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Extracted Data Preview ({extractedData.length} orders)
                </h3>
                <button
                  onClick={() => {
                    setExtractedData([]);
                    setSelectedFile(null);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {unmappedEmails.size > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    ⚠️ {unmappedEmails.size} unmapped email(s) found:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(unmappedEmails).map(email => (
                      <button
                        key={email}
                        onClick={() => openMappingModal(email)}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-200 border border-yellow-300"
                      >
                        {email} (Click to map)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extractedData.slice(0, 50).map((item, index) => {
                    const companyName = getCompanyNameForEmail(item.email);
                    const isMapped = !!companyName;
                    return (
                      <tr key={index} className={isMapped ? '' : 'bg-yellow-50'}>
                        <td className="px-3 py-3 text-sm text-gray-900">{item.sku}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{item.email}</td>
                        <td className="px-3 py-3 text-sm">
                          {isMapped ? (
                            <span className="text-green-700 font-medium">{companyName}</span>
                          ) : (
                            <button
                              onClick={() => openMappingModal(item.email)}
                              className="text-red-600 hover:text-red-800 underline text-xs"
                            >
                              Click to map
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {isMapped ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Mapped</span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Unmapped</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {extractedData.length > 50 && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Showing first 50 of {extractedData.length} orders
                </p>
              )}
              </div>

              {unmappedEmails.size === 0 && (
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setExtractedData([]);
                      setSelectedFile(null);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Set default to current month when opening modal
                      const { firstDay, lastDay } = getCurrentMonthRange();
                      setUploadStartDate(firstDay);
                      setUploadEndDate(lastDay);
                      setShowUploadModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Select Date Range & Upload
                  </button>
                </div>
              )}
            </div>
          </div>
      )}

      {/* Upload Modal with Calendar Date Selection */}
      {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <style dangerouslySetInnerHTML={{__html: `
                .react-calendar {
                  width: 100%;
                  border: none;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  background: transparent;
                }
                .react-calendar__navigation {
                  display: flex;
                  height: 50px;
                  margin-bottom: 1.5em;
                  align-items: center;
                  justify-content: space-between;
                  background: #ffffff;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  padding: 0 16px;
                }
                .react-calendar__navigation button {
                  min-width: 36px;
                  height: 36px;
                  background: #f9fafb;
                  color: #374151;
                  border: 1px solid #e5e7eb;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: 500;
                  transition: all 0.15s ease;
                  padding: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .react-calendar__navigation button:hover:not(:disabled) {
                  background: #f3f4f6;
                  border-color: #d1d5db;
                  color: #111827;
                }
                .react-calendar__navigation button:disabled {
                  opacity: 0.3;
                  cursor: not-allowed;
                }
                .react-calendar__navigation__label {
                  font-size: 15px;
                  font-weight: 600;
                  color: #111827;
                  text-transform: capitalize;
                  pointer-events: none;
                }
                .react-calendar__month-view__weekdays {
                  display: flex;
                  margin-bottom: 8px;
                }
                .react-calendar__month-view__weekdays__weekday {
                  flex: 1;
                  text-align: center;
                  font-size: 11px;
                  font-weight: 600;
                  color: #6b7280;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  padding: 8px 4px;
                  background: transparent;
                }
                .react-calendar__month-view__days {
                  display: grid !important;
                  grid-template-columns: repeat(7, 1fr);
                  gap: 4px;
                }
                .react-calendar__tile {
                  padding: 10px 4px;
                  border-radius: 6px;
                  transition: all 0.15s ease;
                  font-size: 14px;
                  font-weight: 500;
                  border: 1px solid transparent;
                  position: relative;
                  min-height: 40px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #ffffff;
                  color: #374151;
                }
                .react-calendar__tile--disabled {
                  opacity: 0.25;
                  cursor: not-allowed;
                  background: #f9fafb !important;
                  color: #d1d5db !important;
                }
                .react-calendar__tile--active:not(.bg-green-200):not(.bg-yellow-200):not(.bg-red-100) {
                  background: #3b82f6 !important;
                  color: white !important;
                  font-weight: 600;
                  border-color: #2563eb;
                }
                .react-calendar__tile--now:not(.bg-green-200):not(.bg-yellow-200):not(.bg-red-100) {
                  background: #eff6ff;
                  font-weight: 600;
                  color: #1e40af;
                  border: 1px solid #93c5fd;
                }
                .react-calendar__tile:hover:not(.react-calendar__tile--disabled):not(.selected-date) {
                  background: #f3f4f6;
                  border-color: #d1d5db;
                }
                .react-calendar__tile.bg-green-200 {
                  background: #dcfce7 !important;
                  color: #166534 !important;
                  border: 1px solid #86efac !important;
                  font-weight: 600;
                }
                .react-calendar__tile.bg-green-200:hover {
                  background: #bbf7d0 !important;
                  border-color: #4ade80 !important;
                }
                .react-calendar__tile.bg-yellow-200 {
                  background: #fef9c3 !important;
                  color: #854d0e !important;
                  border: 1px solid #fde047 !important;
                  font-weight: 600;
                }
                .react-calendar__tile.bg-yellow-200:hover {
                  background: #fef08a !important;
                  border-color: #facc15 !important;
                }
                .react-calendar__tile.bg-red-100 {
                  background: #fee2e2 !important;
                  color: #991b1b !important;
                  border: 1px solid #fca5a5 !important;
                  font-weight: 500;
                }
                .react-calendar__tile.bg-red-100:hover {
                  background: #fecaca !important;
                  border-color: #f87171 !important;
                }
                .react-calendar__tile.bg-gray-100 {
                  background: #f9fafb !important;
                  color: #9ca3af !important;
                  border: 1px solid #e5e7eb !important;
                }
                .react-calendar__tile.selected-date {
                  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1) !important;
                  outline: 2px solid #111827 !important;
                  outline-offset: 2px !important;
                  z-index: 10 !important;
                  position: relative !important;
                  font-weight: 700 !important;
                }
                .react-calendar__tile.selected-date.bg-green-200,
                .react-calendar__tile.selected-date.bg-yellow-200,
                .react-calendar__tile.selected-date.bg-red-100 {
                  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1) !important;
                  outline: 2px solid #111827 !important;
                  outline-offset: 2px !important;
                }
                .react-calendar__month-view__days__day--neighboringMonth {
                  opacity: 0.3;
                }
              `}} />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Select Date Range for Upload</h3>
                <button
                  onClick={() => {
                    if (!loading) {
                      setShowUploadModal(false);
                      setUploadStartDate('');
                      setUploadEndDate('');
                      setMarkAsHoliday(false);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <Calendar
                      onChange={(date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        setUploadStartDate(dateStr);
                        if (!uploadEndDate || dateStr > uploadEndDate) {
                          setUploadEndDate(dateStr);
                        }
                      }}
                      value={uploadStartDate ? (() => {
                        const parts = uploadStartDate.split('-').map(Number);
                        return new Date(parts[0], parts[1] - 1, parts[2]);
                      })() : null}
                      maxDate={new Date()}
                      tileDisabled={({ date, view }) => {
                        if (view === 'month') {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${day}`;
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          return dateStr > todayStr;
                        }
                        return false;
                      }}
                      tileClassName={({ date, view }) => {
                        if (view === 'month') {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${day}`;
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          
                          const isSelected = uploadStartDate === dateStr;
                          if (dateStr > todayStr) {
                            return 'opacity-50 cursor-not-allowed bg-gray-100';
                          }
                          
                          const isUploaded = uploadedDates.has(dateStr);
                          const isHoliday = holidays.has(dateStr);
                          
                          let classes = '';
                          if (isUploaded) {
                            classes = 'bg-green-200 hover:bg-green-300 text-green-900 font-bold border-2 border-green-400';
                          } else if (isHoliday) {
                            classes = 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900 font-bold border-2 border-yellow-400';
                          } else if (dateStr <= todayStr) {
                            classes = 'bg-red-100 hover:bg-red-200 text-red-800 font-medium border border-red-300';
                          }
                          
                          if (isSelected) {
                            classes += ' selected-date';
                          }
                          
                          return classes;
                        }
                        return '';
                      }}
                      className="w-full border-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <Calendar
                      onChange={(date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        setUploadEndDate(dateStr);
                      }}
                      value={uploadEndDate ? (() => {
                        const parts = uploadEndDate.split('-').map(Number);
                        return new Date(parts[0], parts[1] - 1, parts[2]);
                      })() : null}
                      maxDate={new Date()}
                      minDate={uploadStartDate ? (() => {
                        const parts = uploadStartDate.split('-').map(Number);
                        return new Date(parts[0], parts[1] - 1, parts[2]);
                      })() : undefined}
                      tileDisabled={({ date, view }) => {
                        if (view === 'month') {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${day}`;
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          if (dateStr > todayStr) return true;
                          if (uploadStartDate && dateStr < uploadStartDate) return true;
                          return false;
                        }
                        return false;
                      }}
                      tileClassName={({ date, view }) => {
                        if (view === 'month') {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${day}`;
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          
                          const isSelected = uploadEndDate === dateStr;
                          if (dateStr > todayStr || (uploadStartDate && dateStr < uploadStartDate)) {
                            return 'opacity-50 cursor-not-allowed bg-gray-100';
                          }
                          
                          const isUploaded = uploadedDates.has(dateStr);
                          const isHoliday = holidays.has(dateStr);
                          
                          let classes = '';
                          if (isUploaded) {
                            classes = 'bg-green-200 hover:bg-green-300 text-green-900 font-bold border-2 border-green-400';
                          } else if (isHoliday) {
                            classes = 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900 font-bold border-2 border-yellow-400';
                          } else if (dateStr <= todayStr) {
                            classes = 'bg-red-100 hover:bg-red-200 text-red-800 font-medium border border-red-300';
                          }
                          
                          if (isSelected) {
                            classes += ' selected-date';
                          }
                          
                          return classes;
                        }
                        return '';
                      }}
                      className="w-full border-0"
                    />
                  </div>
                  {/* Legend */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Legend:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-100 border border-green-400 rounded"></span>
                        <span className="text-gray-600">Uploaded</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded"></span>
                        <span className="text-gray-600">Holiday</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-red-100 border border-red-400 rounded"></span>
                        <span className="text-gray-600">Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-gray-100 border border-gray-300 rounded opacity-50"></span>
                        <span className="text-gray-600">Future</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date Range Info */}
                  {uploadStartDate && uploadEndDate && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        Date Range Selected:
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>{formatDate(uploadStartDate)}</strong> to <strong>{formatDate(uploadEndDate)}</strong>
                      </p>
                      {(() => {
                        const dateRange = generateDateRange(uploadStartDate, uploadEndDate);
                        return (
                          <p className="text-xs text-blue-700 mt-1">
                            ({dateRange.length} {dateRange.length === 1 ? 'date' : 'dates'} will be uploaded)
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Progress Bar */}
                  {loading && uploadProgress.message && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">{uploadProgress.message}</span>
                        <span className="text-blue-600 font-bold">{uploadProgress.percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                          style={{ width: `${uploadProgress.percent}%` }}
                        >
                          {uploadProgress.percent > 10 && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Holiday checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="markAsHoliday"
                    checked={markAsHoliday}
                    onChange={(e) => setMarkAsHoliday(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="markAsHoliday" className="ml-2 block text-sm text-gray-700">
                    Mark start date as holiday
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUploadToDatabase}
                    disabled={loading || !uploadStartDate || !uploadEndDate || unmappedEmails.size > 0}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? 'Uploading...' : (() => {
                      const dateRange = uploadStartDate && uploadEndDate ? generateDateRange(uploadStartDate, uploadEndDate) : [];
                      return `Upload for ${dateRange.length} Date(s)`;
                    })()}
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadStartDate('');
                      setUploadEndDate('');
                    }}
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Company-Email Mapping Modal */}
      {showMappingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingMapping ? 'Edit' : 'Add'} Company-Email Mapping
                </h3>
                <button
                  onClick={() => {
                    setShowMappingModal(false);
                    setEditingMapping(null);
                    setNewCompanyName('');
                    setNewEmail('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveMapping}
                    disabled={loading || !newCompanyName.trim() || !newEmail.trim()}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMappingModal(false);
                      setEditingMapping(null);
                      setNewCompanyName('');
                      setNewEmail('');
                    }}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Existing Mappings List */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Existing Mappings</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {emailMappings.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No mappings yet</p>
                  ) : (
                    emailMappings.map((mapping) => (
                      <div
                        key={mapping._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">{mapping.companyName}</div>
                          <div className="text-xs text-gray-500">{mapping.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openMappingModal(mapping.email, mapping.companyName)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMapping(mapping._id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">Delete Cancelled Orders</h3>
                </div>
                <button
                  onClick={() => {
                    if (!loading) {
                      setShowDeleteModal(false);
                      setDeleteDate('');
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Warning Box */}
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-bold text-red-900 mb-1">⚠️ Permanent Action</h4>
                      <p className="text-sm text-red-800">
                        This will <strong>permanently delete ALL cancelled orders</strong> that include the selected date in their date range.
                      </p>
                      <p className="text-sm text-red-900 font-semibold mt-2">
                        This action CANNOT be undone!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date to Delete <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={deleteDate}
                    onChange={(e) => setDeleteDate(e.target.value)}
                    disabled={loading}
                    min={dateRange.min}
                    max={dateRange.max}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base"
                  />
                  {deleteDate && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>You are about to delete:</strong> All cancelled orders that include {formatDate(deleteDate)} in their date range
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (deleteDate) {
                        deleteCancelledOrdersByDate();
                      }
                    }}
                    disabled={loading || !deleteDate}
                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Yes, Delete Permanently
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteDate('');
                    }}
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
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
