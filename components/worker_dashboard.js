import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllItems, fetchAllSections } from '../actions/actions_creators';
import { FaEdit, FaSave, FaTimes, FaTrash, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';
import { PAYMENT_STATUS } from '../lib/constants';
import Select from 'react-select';
import { HTTP } from '../actions/actions_creators';
export default function PayableDashboard(props) {
  const [workDetails, setWorkDetails] = useState([]);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);

  const [startDate, setStartDate] = useState(moment().startOf('day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().endOf('day').format('YYYY-MM-DD'));
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [uniqueSections, setUniqueSections] = useState([]);
  const [uniqueItems, setUniqueItems] = useState([]);
  // Fetch unique sections and items for filtering
  useEffect(() => {
    setUniqueSections([...new Set(sections)]);
  }, [sections, items]);
  useEffect(() => {
    if (selectedSections.length > 0) {
      setUniqueItems([...new Set(items.filter(item => selectedSections.includes(item.section)))]);
    } else {
      setUniqueItems([]);
    }
  }, [selectedSections, items]);
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetchAllSections();
        setSections(response);
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };

    const fetchItems = async () => {
      try {
        const response = await fetchAllItems();
        setItems(response);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchSections();
    fetchItems();
  }, []);


  const fetchWorkDetails = async (reset = false) => {
    try {
      const payment_status = selectedPaymentStatus ? `payment_status=${selectedPaymentStatus}` : '';
      const fromDate = startDate ? `&fromDate=${startDate}` : '';
      const toDate = endDate ? `&toDate=${endDate}` : '';
      const limit = 50;
      const skip = reset ? 0 : offset;

      // Add filters for sections and items
      const sectionFilter = selectedSections.length ? `&sections=${selectedSections.join(',')}` : '';
      const itemFilter = selectedItems.length ? `&items=${selectedItems.join(',')}` : '';

      const data = await HTTP('GET', `/work_records?${payment_status}${fromDate}${toDate}${sectionFilter}${itemFilter}&limit=${limit}&skip=${skip}`);

      if (reset) {
        setWorkDetails(data ?? []);
      } else {
        setWorkDetails(prevDetails => [...prevDetails, ...(data ?? []) ]);
      }

      setHasMore(data.length === limit);
      setOffset(prevOffset => prevOffset + limit);
    } catch (error) {
      console.error('Error fetching work details:', error);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchWorkDetails(true);
  }, [selectedPaymentStatus, startDate, endDate, selectedSections, selectedItems]);

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom && hasMore) {
      fetchWorkDetails();
    }
  };

  const filteredWorkDetails = workDetails?.filter(detail => {
    const createdAt = new Date(detail.createdAt);
    const start = new Date(startDate);

    const end = new Date(endDate);
    end?.setHours(23, 59, 59, 999);
    return (!startDate || createdAt >= start) && (!endDate || createdAt <= end);
  });

  const handleDownloadSummary = async () => {
    const payment_status = selectedPaymentStatus ? `payment_status=${selectedPaymentStatus}` : '';
    const fromDate = startDate ? `&fromDate=${startDate}` : '';
    const toDate = endDate ? `&toDate=${endDate}` : '';
  
    const sectionFilter = selectedSections.length ? `&sections=${selectedSections.join(',')}` : '';
    const itemFilter = selectedItems.length ? `&items=${selectedItems.join(',')}` : '';
  
    const data = await HTTP('GET', `/worker-pays?${payment_status}${fromDate}${toDate}${sectionFilter}${itemFilter}`);
  
    data.sort((a, b) => b.totalAmount - a.totalAmount);
  
    const doc = new jsPDF();
  
    doc.setFontSize(16);
    doc.setFont('Arial', 'bold');
    doc.setTextColor(34, 45, 50);
    doc.text('Worker Pay Summary', 14, 20);
  
    doc.setFontSize(12);
    doc.setFont('Arial', 'normal');
    doc.setTextColor(80, 80, 80);
    const dateRangeText = `Date Range: ${startDate ? new Date(startDate).toLocaleDateString() : 'Start'} to ${
      endDate ? new Date(endDate).toLocaleDateString() : 'End'
    }`;
    doc.text(dateRangeText, 14, 28);
  
    const tableStartY = 40;
    doc.setFontSize(10);
    doc.setFillColor(60, 120, 180);
    doc.rect(14, tableStartY, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Worker', 16, tableStartY + 7);
    doc.text('Total Paid (Rs.)', 90, tableStartY + 7, { align: 'center' });
    doc.text('Total Pending (Rs.)', 130, tableStartY + 7, { align: 'center' });
    doc.text('Total Amount (Rs.)', 170, tableStartY + 7, { align: 'center' });
  
    doc.setTextColor(40, 40, 40);
    let currentY = tableStartY + 15;
  
    let totalPaid = 0;
    let totalPending = 0;
    let totalAmount = 0;
  
    data.forEach((record, index) => {
      const rowHeight = 10; // Adjust as needed
      if (currentY + rowHeight > doc.internal.pageSize.height - 20) {
        doc.addPage();
        currentY = 20;
  
        doc.setFillColor(60, 120, 180);
        doc.rect(14, currentY, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Worker', 16, currentY + 7);
        doc.text('Total Paid (Rs.)', 90, currentY + 7, { align: 'center' });
        doc.text('Total Pending (Rs.)', 130, currentY + 7, { align: 'center' });
        doc.text('Total Amount (Rs.)', 170, currentY + 7, { align: 'center' });
        doc.setTextColor(40, 40, 40);
        currentY += 15;
      }
  
      doc.text(record?.worker?.name + ' ' + (record?.worker?.lastname ?? ''), 16, currentY);
      doc.text(record.paidAmount.toFixed(2), 90, currentY, { align: 'center' });
      doc.text(record.pendingAmount.toFixed(2), 130, currentY, { align: 'center' });
      doc.text(record.totalAmount.toFixed(2), 170, currentY, { align: 'center' });
  
      totalPaid += record.paidAmount;
      totalPending += record.pendingAmount;
      totalAmount += record.totalAmount;
  
      doc.setDrawColor(200, 200, 200);
      doc.line(14, currentY + 2, 194, currentY + 2);
      currentY += rowHeight;
    });
  
    if (currentY + 10 > doc.internal.pageSize.height - 20) {
      doc.addPage();
      currentY = 20;
    }
  
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 180, 10, 'F');
  
    doc.setFont('Arial', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Total', 16, currentY + 7);
    doc.text(totalPaid.toFixed(2), 90, currentY + 7, { align: 'center' });
    doc.text(totalPending.toFixed(2), 130, currentY + 7, { align: 'center' });
    doc.text(totalAmount.toFixed(2), 170, currentY + 7, { align: 'center' });
  
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, 290, { align: 'center' });
    }
  
    doc.save(`worker_pay_summary_${startDate}_${endDate}.pdf`);
  };
  
  
  
  const handleDownload = () => {
    const doc = new jsPDF();

    // Document Styles
    const mainTitleFontSize = 18;
    const sectionFontSize = 14;
    const normalFontSize = 12;
    const titleColor = [52, 73, 94]; // Darker color for the title
    const headerColor = [71, 85, 105]; // Custom blue for the header

    // Add Title, Mobile Number, and Address
    doc.setFontSize(mainTitleFontSize);
    doc.setTextColor(...titleColor);

    doc.setFontSize(normalFontSize);
    doc.setTextColor(0, 0, 0); // Black text for body
    // Add Date Range (if filters are applied)
    if (startDate || endDate) {
      doc.setFontSize(sectionFontSize);
      doc.setTextColor(100, 100, 100); // Gray color for date range text
      const dateText = `Period: ${
        startDate ? new Date(startDate).toLocaleDateString() : 'Start'
      } to ${endDate ? new Date(endDate).toLocaleDateString() : 'End'}`;
      doc.text(dateText, 14, 40);
    }

    // Prepare Table Data
    const tableData = filteredWorkDetails?.reverse()?.map(detail => [
      detail.worker_name,
      detail.section_name,
      detail.item_name,
      detail.piece.toString(),
      `Rs. ${detail.item_rate.toFixed(2)}`,
      `Rs. ${(detail.amount ? detail.amount : detail.piece * detail.item_rate).toFixed(2)}`,
      detail.createdAt ? moment(detail.createdAt).format('DD-MM-YYYY') : '',
      detail.payment_status,
      detail.payment_date ? moment(detail.payment_date).format('DD-MM-YYYY') : '',
    ]);

    // Calculate Total Amount
    const totalAmount = filteredWorkDetails.reduce(
      (sum, detail) => sum + (detail.amount || detail.piece * detail.item_rate),
      0
    );

    // Add Total Row
    tableData.push(['Total', '', '', '', `Rs. ${totalAmount.toFixed(2)}`, '', '', '']);

    // Generate Table with Improved Design
    doc.autoTable({
      startY: startDate || endDate ? 50 : 40,
      head: [
        [
          'Name',
          'Section',
          'Item',
          'Piece',
          'Rate',
          'Amount',
          'Submitted On',
          'Payment Status',
          'Payment Date',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: headerColor,
        fontSize: normalFontSize,
        fontStyle: 'bold',
        textColor: [255, 255, 255],
      },
      bodyStyles: {
        fontSize: normalFontSize - 1,
        cellPadding: 4,
      },
      footStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { top: 20 },
      didDrawPage: data => {
        // Footer for each page with timestamp
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Page ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Generated on: ${new Date().toLocaleString()}`,
          14,
          doc.internal.pageSize.height - 10
        );
      },
    });

    // Save the PDF
    doc.save(`payables${startDate}_${endDate}.pdf`);
  };

  const handleCheckboxChange = id => {
    setSelectedRecords(prevSelected =>
      prevSelected.includes(id)
        ? prevSelected.filter(recordId => recordId !== id)
        : [...prevSelected, id]
    );
  };

  const handleMarkAsPaid = () => {
    const markAsPaid = async () => {
      try {
        const response = await HTTP('POST', '/apply_payments', { recordIds: selectedRecords, payment_status: PAYMENT_STATUS.PAID });

        if (!response.ok) {
          throw new Error('Failed to mark records as paid');
        }

        const result = await response.json();
        setSelectedRecords([]);
        fetchWorkDetails();
        // Optionally, update the UI to reflect the change
      } catch (error) {
        console.error('Error marking records as paid:', error);
      }
    };

    markAsPaid();
    // Implement further logic for marking as paid
  };

  const handleDownloadSelected = () => {
    const doc = new jsPDF();
    const selectedDetails = workDetails?.filter(detail => selectedRecords.includes(detail._id)).reverse();

    // Add Worker Details

    // Prepare Table Data
    const tableData = selectedDetails.map(detail => [
      detail.worker_name,
      detail.section_name,
      detail.item_name,
      detail.piece.toString(),
      `Rs. ${detail.item_rate.toFixed(2)}`,
      `Rs. ${(detail.amount ? detail.amount : detail.piece * detail.item_rate).toFixed(2)}`,
      detail.createdAt ? moment(detail.createdAt).format('DD-MM-YYYY') : '',
      detail.payment_status,
      detail.payment_date ? moment(detail.payment_date).format('DD-MM-YYYY') : '',
    ]);

    // Calculate Total Amount for Selected Records
    const totalAmount = selectedDetails.reduce(
      (sum, detail) => sum + (detail.amount || detail.piece * detail.item_rate),
      0
    );

    // Add Total Row
    tableData.push(['Total', '', '', '', `Rs. ${totalAmount.toFixed(2)}`, '', '', '']);

    // Generate Table
    doc.autoTable({
      startY: 40,
      head: [
        [
          'Name',
          'Section',
          'Item',
          'Piece',
          'Rate',
          'Amount',
          'Submitted On',
          'Payment Status',
          'Payment Date',
        ],
      ],
      body: tableData,
      theme: 'grid',
    });

    // Save the PDF
    doc.save(
      `Selected_Records_${new Date(startDate).toLocaleDateString()}-${new Date(
        endDate
      ).toLocaleDateString()}.pdf`
    );
  };

  const totalSelectedAmount = workDetails
    .filter(detail => selectedRecords.includes(detail._id))
    .reduce((sum, detail) => sum + (detail.amount || detail.piece * detail.item_rate), 0);

  const handleSelectAllChange = e => {
    if (e.target.checked) {
      // Select all filtered work details
      const allIds = filteredWorkDetails
        .filter(d => d.payment_status !== PAYMENT_STATUS.PAID)
        .map(detail => detail._id);
      setSelectedRecords(allIds);
    } else {
      // Deselect all
      setSelectedRecords([]);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const payment_status = selectedPaymentStatus ? `payment_status=${selectedPaymentStatus}` : '';
      const fromDate = startDate ? `&fromDate=${startDate}` : '';
      const toDate = endDate ? `&toDate=${endDate}` : '';
      const data = await HTTP('GET', `/work_records?${payment_status}${fromDate}${toDate}`);

      // Convert data to CSV format
      const csvContent = [
        ['Name', 'Section', 'Item', 'Piece', 'Rate', 'Amount', 'Submitted On', 'Payment Status', 'Payment Date'],
        ...(data?.reverse())?.map(detail => [
          detail.worker_name,
          detail.section_name,
          detail.item_name,
          detail.piece.toString(),
          `Rs. ${detail.item_rate.toFixed(2)}`,
          `Rs. ${(detail.amount ? detail.amount : detail.piece * detail.item_rate).toFixed(2)}`,
          detail.createdAt ? moment(detail.createdAt).format('DD-MM-YYYY') : '',
          detail.payment_status,
          detail.payment_date ? moment(detail.payment_date).format('DD-MM-YYYY') : '',
        ])
      ].map(e => e.join(",")).join("\n");

      // Create a blob and download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `work_details_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const sectionOptions = uniqueSections.map(section => ({
    value: section._id,
    label: section.name,
  }));

  const itemOptions = uniqueItems.map(item => ({
    value: item._id,
    label: `${item.name} (${uniqueSections.find(sec => sec._id === item.section)?.name})`,
  }));

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      {/* Filters in One Line */}
      <div className="flex flex-wrap items-center mb-4 space-x-2">
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() =>
            setSelectedPaymentStatus(prev =>
              prev !== PAYMENT_STATUS.PAID ? PAYMENT_STATUS.PAID : null
            )
          }
          className={`bg-green-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-600 transition ${
            selectedPaymentStatus === PAYMENT_STATUS.PAID && 'bg-blue-800 underline'
          }`}>
          Paid
        </button>
        <button
          onClick={() =>
            setSelectedPaymentStatus(prev =>
              prev !== PAYMENT_STATUS.PENDING ? PAYMENT_STATUS.PENDING : null
            )
          }
          className={`bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition ${
            selectedPaymentStatus === PAYMENT_STATUS.PENDING && 'bg-blue-800 underline'
          }`}>
          Unpaid
        </button>
        <Select
          isMulti
          options={sectionOptions}
          value={sectionOptions.filter(option => selectedSections.includes(option.value))}
          onChange={selected => setSelectedSections(selected.map(option => option.value))}
          className="basic-multi-select w-64"
          classNamePrefix="select"
          placeholder="Select Sections"
        />
        <Select
            isMulti
            options={itemOptions}
            value={itemOptions.filter(option => selectedItems.includes(option.value))}
          onChange={selected => setSelectedItems(selected.map(option => option.value))}
          className="basic-multi-select w-64 "
          classNamePrefix="select"
          placeholder="Select Items"
        />
      </div>


      {/* Work Details Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full">
        <div className="flex justify-between items-center mb-6 px-4 py-2 bg-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">All Payable Dashboard</h2>
          {filteredWorkDetails.length > 0 && (
            <div className="flex gap-2">
              <button
              onClick={handleDownloadSummary}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                <FaDownload /> Download Summary PDF
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                <FaDownload /> Download PDF
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <FaDownload /> Download CSV
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'scroll' }} onScroll={handleScroll}>
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 p-4 font-medium text-gray-700">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Piece</th>
                <th className="px-4 py-2">Rate</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Submitted On</th>
                <th className="px-4 py-2">Payment Status</th>
                <th className="px-4 py-2">Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkDetails.length > 0 ? (
                filteredWorkDetails.map(detail => (
                  <tr key={detail._id} className="border-b last:border-none text-gray-700">
                    <td className="px-4 py-2">{detail.worker?.name} {detail.worker?.lastname ?? ""} </td>
                    <td className="px-4 py-2">{detail.section_name}</td>
                    <td className="px-4 py-2">{detail.item_name}</td>
                    <td className="px-4 py-2">{detail.piece}</td>
                    <td className="px-4 py-2">₹{detail.item_rate}</td>
                    <td className="px-4 py-2">
                      ₹
                      {detail.amount
                        ? detail.amount.toFixed(2)
                        : (detail.piece * detail.item_rate).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {detail.createdAt ? moment(detail.createdAt).format('LLL') : ''}
                    </td>
                    <td className="px-4 py-2">
                      {detail.payment_status === PAYMENT_STATUS.PAID
                        ? PAYMENT_STATUS.PAID
                        : PAYMENT_STATUS.PENDING}
                    </td>
                    <td className="px-4 py-2">
                      {detail.payment_date ? moment(detail.payment_date).format('LLL') : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-4 text-gray-500 text-center">No work details found</td>
                </tr>
              )}
            </tbody>
            {filteredWorkDetails.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2">
                  {filteredWorkDetails.reduce((sum, detail) => sum + detail.piece, 0)}
                  </td>
                  <td className="px-4 py-2">
                    ₹
                    {filteredWorkDetails
                      .reduce(
                        (sum, detail) => sum + (detail.amount || detail.piece * detail.item_rate),
                        0
                      )
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                  <td className="px-4 py-2">
                   
                  </td>
                  </td>
                  <td className="px-4 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Action Bar */}
        {selectedRecords.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 flex justify-between items-center">
            <div className="text-lg font-semibold">
              Total Amount: ₹{totalSelectedAmount.toFixed(2)}
            </div>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    selectedRecords.length ===
                    filteredWorkDetails.filter(d => d.payment_status !== PAYMENT_STATUS.PAID).length
                  }
                  onChange={handleSelectAllChange}
                  className="mr-2"
                />
                Select All Unpaid
              </label>
              <button
                onClick={handleMarkAsPaid}
                className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Mark As Paid
              </button>
              <button
                onClick={handleDownloadSelected}
                className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition">
                Download Selected
              </button>
              <button
                onClick={() => setSelectedRecords([])}
                className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition">
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
