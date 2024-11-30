import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllItems, fetchAllSections, HTTP } from '../actions/actions_creators';
import { FaEdit, FaSave, FaTimes, FaTrash, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';
import { FINAL_PRODUCT_SECTION, PAYMENT_STATUS } from '../lib/constants';
import Select from 'react-select';
import { toast } from 'react-toastify';
import _ from 'lodash';
import ItemOptionsForFinalProduct from '../components/ItemOptionsForFinalProduct';
export default function PayableDashboard(props) {
  const [items, setItems] = useState([]);
  const [selectedSection, setSelectedSection] = useState({});
  const [startDate, setStartDate] = useState(moment().startOf('day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().endOf('day').format('YYYY-MM-DD'));
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [newItem, setNewItem] = useState(null);
  const [newPiece, setNewPiece] = useState('');
  const [limit, setLimit] = useState(20);
  const [productsCounts, setProductsCounts] = useState([]);

  // Fetch unique sections and items for filtering

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetchAllSections();
        const finalProductSection = response.find(sec => sec.name === FINAL_PRODUCT_SECTION);
        setSelectedSection(finalProductSection);
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

  useEffect(() => {
    setOffset(0);
    getProducts(true);
  }, [startDate, endDate, selectedItems]);

  const getProducts = async (reset, off_set) => {
    try {
      const response = await HTTP('GET', `/final-product?fromDate=${startDate}&toDate=${endDate}&items=${selectedItems.join(    
        ','
      )}&limit=${limit}&skip=${reset ? 0 : off_set}`
      );
      if (!response) {
        throw new Error('Failed to fetch products');
      }
      const {data, counts} = response;
      if(counts){
        setProductsCounts(counts)
      }
      if (reset) {
        setProducts(data);
        setOffset(0);
      } else {
        setProducts(prevProducts => [
          ...prevProducts,
          ...data.filter(d => !prevProducts.find(p => p._id == d._id)),
        ]);
      }
      setHasMore(data?.length === limit);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('An error occurred while fetching products.');
    }
  };

  const handleScroll = e => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const bottom = scrollHeight - scrollTop <= clientHeight + 1;
    if (bottom && hasMore) {
      setOffset(prevOffset => prevOffset + limit);
      getProducts(false, offset + limit);
    }
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

    // Calculate Total Pieces
    const totalPieces = products.reduce((sum, detail) => sum + detail.piece, 0);
    doc.text(`Total Pieces: ${totalPieces}`, 14, 50);

    // Prepare Table Data
    const tableData = products.map(detail => [
      detail.item_name,
      detail.piece.toString(),
      detail.createdAt ? moment(detail.createdAt).format('DD-MM-YYYY') : '',
      detail.addedBy?.name,
    ]);

    // Add Total Row for Pieces
    tableData.push(['Total Pieces', totalPieces.toString(), '']);

    // Generate Table with Improved Design
    doc.autoTable({
      startY: 60,
      head: [
        [
          'Item Name',
          'Pieces',
          'Submitted On',
          'Submitted By',
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

  const handleDownloadCSV = async () => {
    try {
      // Fetch final product data using HTTP instead of fetch
      const response = await HTTP('GET', `/final-product?fromDate=${startDate}&toDate=${endDate}&items=${selectedItems.join(',')}`);
      const data = response.data; // Assuming the response structure has a data field

      // Calculate total pieces
      const totalPieces = data.reduce((sum, detail) => sum + detail.piece, 0);

      // Convert data to CSV format for final products
      const csvContent = [
        [
          'Item Name',
          'Pieces',
          'Submitted On',
          'Submitted By',
        ],
        ...data.map(detail => [
          detail.item_name,
          detail.piece.toString(),
          detail.createdAt ? moment(detail.createdAt).format('DD-MM-YYYY') : '',
          detail.addedBy?.name,
        ]),
        // Add total row
        ['Total Pieces', totalPieces.toString(), '', ''],
      ]
        .map(e => e.join(','))
        .join('\n');

      // Create a blob and download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `final_product_details_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const itemOptions = items
    .filter(item => item.section === selectedSection?._id)
    .map(item => ({
      value: item._id,
      label: item.name,
    }));

  const handleCreateRecord = async () => {
    if (!newItem || !newPiece) {
      toast.error('Please select an item and enter the number of pieces.');
      return;
    }

    try {
      const response = await HTTP('POST', '/final-product', {
        item: newItem.value,
        piece: parseInt(newPiece, 10),
        item_name: newItem.label,
        section: selectedSection?._id,
        section_name: selectedSection?.name,
      });

      if (response) {
        toast.success('Items submitted successfully!');
        setNewItem(null);
        setNewPiece('');
        getProducts(true);
      } else {
        toast.error('Failed to submit items.');
      }
    } catch (error) {
      console.error('Error submitting items:', error);
      toast.error('An error occurred while submitting items.');
    }
  };

  return (
    <div className='h-full'>
      <div className="flex flex-col md:flex-row justify-between items-center mb-2 px-4 py-2">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2 md:mb-0">All Products Submitted</h2>
        {products?.length > 0 && (
          <div className="flex gap-2">
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
      <div className="flex flex-col md:flex-row justify-center bg-gray-100 ">
        <div className="w-full md:w-1/5 p-5">
          <div className="flex flex-col flex-wrap mb-4 space-y-2">
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
          </div>
          <ItemOptionsForFinalProduct
            items={items.filter(item => item.section === selectedSection?._id)}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            productsCounts={productsCounts}
          />
        </div>
        <div className="flex flex-col p-4 w-full md:w-4/5 h-full">
          {/* Add New Record Form */}
          <div className="flex  justify-start mb-4 space-x-2">
            <Select
              options={itemOptions}
              value={newItem}
              onChange={setNewItem}
              className="basic-single w-full md:w-64"
              classNamePrefix="select"
              placeholder="Select Item"
            />
            <input
              type="number"
              value={newPiece}
              onChange={e => setNewPiece(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter number of pieces"
            />
            <button
              onClick={handleCreateRecord}
              className="bg-blue-600 flex items-center justify-between text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <FaSave className='mr-2' /> Submit Items
            </button>
          </div>
          {/* Work Details Table */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full ">
            <div
              className="overflow-x-auto"
              style={{ maxHeight: '70vh', overflowY: 'scroll' }}
              id="scrollable-container"
              onScroll={handleScroll}>
              <table className="min-w-full bg-white">
                <thead className='sticky top-0'>
                  <tr className="bg-gray-100 p-4 font-medium text-gray-700">
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-left">Piece</th>
                    <th className="px-4 py-2 text-left">Submitted On</th>
                    <th className="px-4 py-2 text-left">Submitted By</th>
                  </tr>
                </thead>
                <tbody>
                  {products?.length > 0 ? (
                    products.map(detail => (
                      <tr key={detail._id} className="border-b last:border-none text-gray-700">
                        <td className="px-4 py-2">{detail.item_name}</td>
                        <td className="px-4 py-2">{detail.piece}</td>
                        <td className="px-4 py-2">
                          {detail.createdAt ? moment(detail.createdAt).format('LLL') : ''}
                        </td>
                        <td className="px-4 py-2">{detail.addedBy?.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-4 text-gray-500 text-center">
                        No Products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
