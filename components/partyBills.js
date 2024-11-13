import React, { useEffect, useState } from 'react';
import { FaEdit, FaSave, FaTimes, FaTrash, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';
import axios from 'axios';

export default function PartyBills({ selectedParty, user }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBills, setSelectedBills] = useState([]);
  const [form, setForm] = useState({
    _id: null,
    amount: '',
    partyName: selectedParty?.name || '',
    vendorId: selectedParty?._id || '',
    invoiceNo: '',
    billDate: moment().format('MM-DD-YYYY'),
    addedBy: user?._id || '', 
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchVendorBills();
    if (selectedParty) {
      setForm({
        _id: null,
        amount: '',
        partyName: selectedParty?.name || '',
        vendorId: selectedParty?._id || '',
        invoiceNo: '',
        billDate: moment().format('MM-DD-YYYY'),
        addedBy: user?._id || '', 
      });
    }
  }, [selectedParty]);

  const fetchVendorBills = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/vendor-bills`, {
        params: { vendorId: selectedParty?._id }
      });
      setBills(response.data);
    } catch (err) {
      setError('Failed to load vendor bills');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await axios.put(`/api/vendor-bills`, form);
      } else {
        await axios.post(`/api/vendor-bills`, form);
      }
      fetchVendorBills();
      resetForm();
    } catch (err) {
      setError('Failed to save the vendor bill');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bill) => {
    setForm({ ...bill, billDate: moment(bill.billDate).format('DD-MM-YYYY') });
    setIsEditing(true);
  };

  const handleDelete = async (_id) => {
    setLoading(true);
    try {
      await axios.delete(`/api/vendor-bills`, { params: { _id } });
      fetchVendorBills();
    } catch (err) {
      setError('Failed to delete the vendor bill');
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
      billDate: '',
      addedBy: user?._id || '',
    });
    setIsEditing(false);
  };

  const handleSelect = (id) => {
    setSelectedBills((prevSelected) =>
      prevSelected.includes(id) ? prevSelected.filter((billId) => billId !== id) : [...prevSelected, id]
    );
  };

  const selectAll = () => {
    setSelectedBills(bills.map((bill) => bill._id));
  };

  const deselectAll = () => {
    setSelectedBills([]);
  };

  const downloadPDF = () => {
    const selectedData = bills.filter((bill) => selectedBills.includes(bill._id));
    const doc = new jsPDF();
    doc.text("Vendor Bills Report", 20, 10);
    doc.autoTable({
      head: [['Party Name', 'Invoice No', 'Bill Date', 'Payment Status', 'Amount', 'Paid Amount', 'Remain Amount']],
      body: selectedData.map(bill => [
        bill.partyName,
        bill.invoiceNo,
        moment(bill.billDate).format('DD-MM-YYYY'),
        bill.status,
        bill.amount,
        bill.paidAmount,
        bill.remainAmount,
      ]),
    });
    doc.save("selected_vendor_bills_report.pdf");
  };

  const downloadCSV = () => {
    const selectedData = bills.filter((bill) => selectedBills.includes(bill._id));
    const csvContent = [
      ['Party Name', 'Invoice No', 'Bill Date', 'Payment Status', 'Amount', 'Paid Amount', 'Remain Amount'],
      ...selectedData.map((bill) => [
        bill.partyName,
        bill.invoiceNo,
        moment(bill.billDate).format('DD-MM-YYYY'),
        bill.status,
        bill.amount,
        bill.paidAmount,
        bill.remainAmount,
      ]),
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "selected_vendor_bills.csv";
    link.click();
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6 text-center text-gray-700">
        Vendor Bills for {selectedParty?.name}
      </h1>

      {loading && <p className="text-center text-gray-500">Loading...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="grid grid-cols-5 gap-4 mb-4">
          <input
            name="amount"
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={handleInputChange}
            className="border rounded px-4 py-2 focus:outline-none focus:border-blue-400"
            required
          />
          <input
            name="partyName"
            type="text"
            placeholder="Party Name"
            value={form.partyName}
            onChange={handleInputChange}
            className="border rounded px-4 py-2 focus:outline-none focus:border-blue-400"
            required
          />
          <input
            name="invoiceNo"
            type="text"
            placeholder="Invoice No"
            value={form.invoiceNo}
            onChange={handleInputChange}
            className="border rounded px-4 py-2 focus:outline-none focus:border-blue-400"
            required
          />
          <input
            name="billDate"
            type="date"
            value={form.billDate}
            onChange={handleInputChange}
            className="border rounded px-4 py-2 focus:outline-none focus:border-blue-400"
          />
          <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:shadow-outline">
            {isEditing ? <><FaSave className="inline mr-2" /> Update</> : <><FaEdit className="inline mr-2" /> Add</>}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded shadow-md">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">
                <input
                  type="checkbox"
                  checked={selectedBills.length === bills.length}
                  onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                />
              </th>
              <th className="py-3 px-6 text-left">Party Name</th>
              <th className="py-3 px-6 text-left">Invoice No</th>
              <th className="py-3 px-6 text-left">Bill Date</th>
              <th className="py-3 px-6 text-center">Status</th>
              <th className="py-3 px-6 text-left">Amount</th>
              <th className="py-3 px-6 text-left">Paid Amount</th>
              <th className="py-3 px-6 text-left">Remain Amount</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {bills.map((bill) => (
              <tr key={bill._id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBills.includes(bill._id)}
                    onChange={() => handleSelect(bill._id)}
                  />
                </td>
                <td className="py-3 px-6 text-left">{bill.partyName}</td>
                <td className="py-3 px-6 text-left whitespace-nowrap">{bill.invoiceNo}</td>
                <td className="py-3 px-6 text-left">{moment(bill.billDate).format('DD-MM-YYYY')}</td>
                <td className="py-3 px-6 text-center">{bill.status}</td>
                <td className="py-3 px-6 text-left">{bill.amount}</td>
                <td className="py-3 px-6 text-left">{bill.paidAmount}</td>
                <td className="py-3 px-6 text-left">{bill.remainAmount}</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center space-x-2">
                    <button onClick={() => handleEdit(bill)} className="text-blue-500 hover:text-blue-700">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(bill._id)} className="text-red-500 hover:text-red-700">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedBills.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-gray-600">
            {selectedBills.length} selected
          </div>
          <div className="flex space-x-4">
            <button onClick={selectAll} className="text-blue-500 hover:underline">
              Select All
            </button>
            <button onClick={deselectAll} className="text-blue-500 hover:underline">
              Deselect All
            </button>
            <button onClick={downloadCSV} className="text-green-500 hover:underline">
              Download CSV
            </button>
            <button onClick={downloadPDF} className="text-green-500 hover:underline">
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
