import React, { useEffect, useState, useRef } from 'react';
import { FaEdit, FaTrash, FaDownload, FaFileDownload, FaInfoCircle } from 'react-icons/fa';
import moment from 'moment';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import { toast } from 'react-toastify';
import AddBillModal from './AddBillModal';
import { VENDOR_BILL_STATUS, VENDOR_BILL_TYPES } from '../lib/constants';
import ApplyVendorPaymentModel from './ApplyVendorPaymentModel';
import { Tooltip as ReactTooltip } from 'react-tooltip'; // Use named import for Tooltip
import VendorBillPaymentHistory from './VendorBillPaymentHistory';
import InlinePaymentHistory from './bill_payment';
import { HTTP } from '../actions/actions_creators';

export default function PartyBills({ selectedParty, user, isBillModified, setIsBillModified }) {
  const [bills, setBills] = useState([]);
  const [selectedBills, setSelectedBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    _id: null,
    amount: '',
    partyName: selectedParty?.name || '',
    vendorId: selectedParty?._id || '',
    invoiceNo: '',
    billDate: moment().format('MM-DD-YYYY'),
    lastModifiedBy: user?._id || '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Pagination and Filters
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(null);
  const [openApplyPayment, setOpenApplyPayment] = useState(false);

  const [openPaymentHistory, setOpenPaymentHistory] = useState(false);
  const [billForPaymentHistory, setBillForPaymentHistory] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [totalRemainAmount, setTotalRemainAmount] = useState(0);
  const observerRef = useRef();

  useEffect(() => {
    setPage(1); // Reset page when filters or selectedParty changes
    fetchVendorBills(true); // Reset the data
    resetForm();
    setIsBillModified([]);
    setSelectedBills([]);
  }, [selectedParty, startDate, endDate, selectedPaymentStatus]);

  useEffect(() => {
    if (page > 1) {
      fetchVendorBills(); // Fetch additional pages for infinite scroll
    }
  }, [page]);

  const fetchVendorBills = async (reset = false) => {
    setLoading(true);
    fetchTotalCounts();
    try {
      const response = await HTTP('GET',`/vendor-bills`, {
        params: {
          vendorId: selectedParty?._id || null,
          page,
          limit: 20,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: selectedPaymentStatus || undefined,
        },
      });

      const newBills = response;
      setBills(prevBills => (reset ? newBills : [...prevBills, ...newBills]));
      setHasMore(newBills.length === 20);
    } catch (err) {
      toast.error('Failed to load vendor bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalCounts = async () => {
    const response = await HTTP('GET',`/vendor-bills/counts`, {
      params: {
        vendorId: selectedParty?._id || null,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
    });
    let responseData = null;
    if (selectedParty?._id) {
      responseData = response.data?.find(item => item._id === selectedParty?._id);
      setTotalAmount(responseData?.totalAmount || 0);
      setTotalPaidAmount(responseData?.totalPaidAmount || 0);
      setTotalRemainAmount(responseData?.totalRemainAmount || 0);
    } else {
      if (!selectedParty?._id) {
        let totalAmount = 0;
        let totalPaidAmount = 0;
        let totalRemainAmount = 0;
        response.data?.data?.forEach(item => {
          totalAmount += item.totalAmount;
          totalPaidAmount += item.totalPaidAmount;
          totalRemainAmount += item.totalRemainAmount;
        });
        setTotalAmount(totalAmount);
        setTotalPaidAmount(totalPaidAmount);
        setTotalRemainAmount(totalRemainAmount);
      }
    }
  };
  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        const response = await HTTP('PUT',`/vendor-bills`, form);
      } else {
        const response = await HTTP('POST',`/vendor-bills`, form);
      }
      fetchVendorBills(true);
      setIsBillModified(prev => !prev);
      resetForm();
    } catch (err) {
      toast.error('Failed to save the vendor bill');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      _id: null,
      amount: '',
      partyName: selectedParty?.name || '',
      vendorId: selectedParty?._id || '',
      invoiceNo: '',
      billDate: moment().format('MM-DD-YYYY'),
      lastModifiedBy: user?._id || '',
    });
    setIsEditing(false);
    setOpen(false);
  };

  const handleEdit = bill => {
    setForm({ ...bill, billDate: moment(bill.billDate).format('YYYY-MM-DD') });
    setIsEditing(true);
    setOpen(true);
  };

  const handleDelete = async _id => {
    setLoading(true);
    try {
      const response = await HTTP('DELETE',`/vendor-bills`, { params: { _id } });
      fetchVendorBills(true);
      setIsBillModified(prev => !prev);
    } catch (err) {
      toast.error('Failed to delete the vendor bill');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = entries => {
    if (entries[0].isIntersecting && hasMore && !loading) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const handleSelect = id => {
    setSelectedBills(prev =>
      prev.includes(id) ? prev.filter(billId => billId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedBills(bills.map(bill => bill._id));
  };

  const deselectAll = () => {
    setSelectedBills([]);
  };

  const downloadCSV = () => {
    const selectedData = bills.filter(bill => selectedBills.includes(bill._id)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const csvContent = [
      [
        'Vendor Name',
        'Invoice No / Payment Mode',
        'Bill Date',
        'Amount',
        'Paid Amount',
      ],
      ...selectedData.map(bill => [
        bill.partyName,
        bill.type === VENDOR_BILL_TYPES.ADD ? bill.invoiceNo : bill.paymentMode,
        moment(bill.billDate).format('DD-MM-YYYY'),
        bill.type === VENDOR_BILL_TYPES.ADD ? bill.amount : "",
        bill.type === VENDOR_BILL_TYPES.SUB ? bill.amount : "",
      ]),
      // Add totals row
      [
        'Total',
        '',
        '',
        selectedData.reduce((sum, bill) => sum + (bill.type === VENDOR_BILL_TYPES.ADD ? bill.amount : 0), 0),
        selectedData.reduce((sum, bill) => sum + (bill.type === VENDOR_BILL_TYPES.SUB ? bill.amount : 0), 0),
      ],
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'selected_vendor_bills.csv';
    link.click();
  };

  const downloadPDF = () => {
    const selectedData = bills.filter(bill => selectedBills.includes(bill._id)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const doc = new jsPDF();
    doc.text('Vendor Bills Report', 20, 10);
    doc.autoTable({
      head: [
        [
          'Vendor Name',
          'Invoice No / Payment Mode',
          'Bill Date',
          'Amount',
          'Paid Amount',
        ],
      ],
      body: [
        ...selectedData.map(bill => [
          bill.partyName,
          bill.type === VENDOR_BILL_TYPES.ADD ? bill.invoiceNo : bill.paymentMode,
          moment(bill.billDate).format('DD-MM-YYYY'),
          bill.type === VENDOR_BILL_TYPES.ADD ? bill.amount : "",
          bill.type === VENDOR_BILL_TYPES.SUB ? bill.amount : "",
        ]),
        // Add totals row
        [
          'Total',
          '',
          '',
          selectedData.reduce((sum, bill) => sum + (bill.type === VENDOR_BILL_TYPES.ADD ? bill.amount : 0), 0),
          selectedData.reduce((sum, bill) => sum + (bill.type === VENDOR_BILL_TYPES.SUB ? bill.amount : 0), 0),
        ],
      ],
    });
    doc.save('selected_vendor_bills_report.pdf');
  };

  const fetchModifiedBills = async () => {
    const response = await HTTP('GET',`/vendor-bills`, {
      params: {
        _ids: isBillModified,
      },
    });

    const newBills = response;

    setBills(prevBills =>
      prevBills.map(bill => newBills?.find(newBill => newBill._id === bill._id) || bill)
    );
    setIsBillModified([]);
  };
  useEffect(() => {
    if (isBillModified?.length > 0) {
      fetchModifiedBills();
    }
    fetchTotalCounts();
  }, [isBillModified]);

  useEffect(() => {
    const observer = new IntersectionObserver(loadMore, { threshold: 1 });
    if (observerRef.current) observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.disconnect();
    };
  }, [observerRef, hasMore, loading]);

  return (
    <div className="container mx-auto">
      {open && (
        <AddBillModal
          handleSubmit={handleSubmit}
          form={form}
          handleInputChange={handleInputChange}
          isEditing={isEditing}
          open={open}
          setOpen={setOpen}
          isBillModified={isBillModified}
          setIsBillModified={setIsBillModified}
        />
      )}
      {openApplyPayment && (
        <ApplyVendorPaymentModel
          open={openApplyPayment}
          setOpen={setOpenApplyPayment}
          selectedParty={selectedParty}
          isBillModified={isBillModified}
          setIsBillModified={setIsBillModified}
          fetchVendorBills={fetchVendorBills}
          user={user}
        />
      )}
      {openPaymentHistory && (
        <VendorBillPaymentHistory
          open={openPaymentHistory}
          setOpen={setOpenPaymentHistory}
          billForPaymentHistory={billForPaymentHistory}
          isBillModified={isBillModified}
          setIsBillModified={setIsBillModified}
        />
      )}
      <h4 className="text-xl font-semibold mb-6 text-center text-gray-700">Vendor Bills</h4>

      {/* Date Filters */}
      <div className="flex justify-start space-x-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-600">Start Bill Date</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={e => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600">End Bill Date</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={e => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        {/* <button
          // onClick={() =>
          //   setSelectedPaymentStatus(prev =>
          //     prev !== VENDOR_BILL_STATUS.PAID ? VENDOR_BILL_STATUS.PAID : null
          //   )
          // }
          className={`bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg ml-2 hover:bg-green-600 transition ${
            selectedPaymentStatus === VENDOR_BILL_STATUS.PAID && 'bg-blue-800 underline'
          }`}>
          Paid (Rs.{totalPaidAmount})
        </button> */}
        <button
          // onClick={() =>
          //   setSelectedPaymentStatus(prev =>
          //     prev !== VENDOR_BILL_STATUS.PENDING ? VENDOR_BILL_STATUS.PENDING : null
          //   )
          // }
          className={`bg-red-500 text-white font-semibold px-4 py-2  ml-2 rounded-lg hover:bg-red-600 transition ${
            selectedPaymentStatus === VENDOR_BILL_STATUS.PENDING && 'bg-blue-800 underline'
          }`}>
          Due (Rs.{totalRemainAmount})
        </button>
        {selectedParty && (
          <>
          <button
              onClick={() => setOpen(true)}
              className="flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              <FaEdit className="mr-2" /> Add New Bill
            </button>
            <button
              onClick={() => {
                setSelectedBills([]);
                setOpenApplyPayment(true);
              }}
              className="flex items-center bg-red-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              <FaEdit className="mr-2" /> Add Payment
            </button>
            
          </>
        )}
      </div>

      {selectedBills.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 fixed bottom-0 left-0 right-0 flex justify-between items-center">
          <p>{selectedBills.length} selected</p>
          <div className="flex space-x-4">
            <button
              onClick={selectAll}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Deselect All
            </button>
            {selectedParty && (
              <button
                onClick={() => setOpenApplyPayment(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Apply Payment
              </button>
            )}
            <button
              onClick={downloadCSV}
              className="bg-green-500 text-white flex items-center gap-2 px-4 py-2 rounded hover:bg-green-600">
              <FaDownload /> Download CSV
            </button>
            <button
              onClick={downloadPDF}
              className="bg-green-500 text-white flex items-center gap-2 px-4 py-2 rounded hover:bg-green-600">
              <FaFileDownload /> Download PDF
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-center text-gray-500">Loading...</p>}

      {/* Bills Table */}
      <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'scroll' }}>
        <table className="min-w-full bg-white border border-gray-200 rounded shadow-md">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">
                <input
                  type="checkbox"
                  checked={selectedBills.length && selectedBills.length === bills.length}
                  onChange={e => (e.target.checked ? selectAll() : deselectAll())}
                />
              </th>
              <th className="py-3 px-6 text-left">Vendor Name</th>
              <th className="py-3 px-6 text-left">Invoice No / Payment Mode</th>
              <th className="py-3 px-6 text-left">Bill Date / Payment Date</th>

              <th className="py-3 px-6 text-left">Amount</th>
              <th className="py-3 px-6 text-left">Paid Amount</th>
              <th className="py-3 px-6 text-left">Notes</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {bills.map(bill => (
              <>
              <tr key={bill._id} className="border border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBills.includes(bill._id)}
                    onChange={() => handleSelect(bill._id)}
                  />
                </td>
                <td className="py-3 px-6 text-left">{bill.partyName}</td>
                <td className="py-3 px-6 text-left"> {bill.type === VENDOR_BILL_TYPES.ADD ? bill.invoiceNo : bill.paymentMode} </td>
                <td className="py-3 px-6 text-left">
                  {moment(bill.billDate).format('DD-MM-YYYY')}
                </td>
                <td className="py-3 px-6 text-left font-bold text-blue-600">{bill.type === VENDOR_BILL_TYPES.ADD ? `Rs.${bill.amount}` : ""}</td>
                <td className="py-3 px-6 text-left font-bold text-red-600">{bill.type === VENDOR_BILL_TYPES.SUB ? `Rs.${bill.amount}` : ""}</td>
                <td className="py-3 px-6 text-left">{bill.notes}</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handleEdit(bill)}
                      className="text-blue-500 hover:text-blue-700">
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(bill._id)}
                      className="text-red-500 hover:text-red-700">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
              </>
            ))}
            {loading && (
              <tr className="border-b border-gray-200">
                <td colSpan={9} className="text-center py-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-4 border-gray-900 border-r-4"></div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Observer */}
      <div ref={observerRef} className="h-10" />
    </div>
  );
}
