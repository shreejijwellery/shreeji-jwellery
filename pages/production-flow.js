import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllItems, fetchAllSections, HTTP } from '../actions/actions_creators';
import { FaDownload, FaPlus, FaTimes } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';
import { FINAL_PRODUCT_SECTION } from '../lib/constants';
import Select from 'react-select';
import ItemSelectWithImage from '../components/ItemSelectWithImage';
import { toast } from 'react-toastify';
import { useFeatureFlags } from '../utils/useFeatureFlags';

export default function ProductionFlowDashboard() {
  const { checkFeature, loading: flagsLoading } = useFeatureFlags();
  const [items, setItems] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [finalProductSection, setFinalProductSection] = useState(null);
  
  // Column 1: In-Process
  const [col1Filters, setCol1Filters] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    selectedItems: []
  });
  const [col1Data, setCol1Data] = useState([]);
  
  // Column 5: Final Products
  const [col5Filters, setCol5Filters] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    selectedItems: []
  });
  const [col5Data, setCol5Data] = useState([]);
  
  // Middle columns (dynamic)
  const [middleColumns, setMiddleColumns] = useState([
    {
      id: 1,
      startDate: moment().startOf('month').format('YYYY-MM-DD'),
      endDate: moment().endOf('month').format('YYYY-MM-DD'),
      selectedItems: [],
      selectedSection: null,
      data: []
    }
  ]);
  
  const [loading, setLoading] = useState(false);

  // Fetch items and sections on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch sections
        const sectionsResponse = await fetchAllSections();
        setAllSections(sectionsResponse);
        
        // Find and set Final Product section
        const finalProductSec = sectionsResponse.find(sec => sec.name === FINAL_PRODUCT_SECTION);
        setFinalProductSection(finalProductSec);
        
        // Fetch items
        const itemsResponse = await fetchAllItems();
        setItems(itemsResponse);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to load items and sections');
      }
    };

    fetchInitialData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    if (items.length > 0 && finalProductSection) {
      fetchInProcessData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col1Filters, finalProductSection, items.length]);

  useEffect(() => {
    if (items.length > 0 && finalProductSection) {
      fetchFinalProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col5Filters, finalProductSection, items.length]);

  // Create a memoized dependency string for middle column filters
  const middleColumnsFiltersKey = useMemo(() => {
    return middleColumns.map(col => 
      `${col.startDate}-${col.endDate}-${col.selectedSection?.value || ''}-${col.selectedItems.join(',')}`
    ).join('|');
  }, [middleColumns]);

  // Fetch data for middle columns when filters change or when items are loaded
  useEffect(() => {
    if (items.length > 0) {
      middleColumns.forEach((_, index) => {
        fetchSectionDataForColumn(index);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [middleColumnsFiltersKey, items.length]);

  const fetchInProcessData = async () => {
    try {
      const params = new URLSearchParams({
        fromDate: col1Filters.startDate,
        toDate: col1Filters.endDate,
      });
      
      // Add section filter for Final Product section
      if (finalProductSection) {
        params.append('section', finalProductSection._id);
      }
      
      if (col1Filters.selectedItems.length > 0) {
        params.append('items', col1Filters.selectedItems.join(','));
      }

      const response = await HTTP('GET', `/in-process-product?${params.toString()}`);
      if (response && response.counts) {
        // Map counts to include item names
        const countsWithNames = response.counts.map(count => ({
          _id: count._id,
          item_name: count.item_name || 'Unknown Item',
          totalPiece: count.totalPiece
        }));
        setCol1Data(countsWithNames);
      }
    } catch (error) {
      console.error('Error fetching in-process data:', error);
    }
  };

  const fetchSectionDataForColumn = async (columnIndex) => {
    const filters = middleColumns[columnIndex];
    try {
      const params = new URLSearchParams({
        fromDate: filters.startDate,
        toDate: filters.endDate,
      });
      
      // Add section filter if selected
      if (filters.selectedSection) {
        params.append('sections', filters.selectedSection.value);
      }
      
      // Add items filter if selected
      if (filters.selectedItems.length > 0) {
        params.append('items', filters.selectedItems.join(','));
      }

      const response = await HTTP('GET', `/work_records?${params.toString()}`);
      if (response) {
        // Aggregate work records by item AND section
        const itemMap = {};
        response.forEach(record => {
          const key = `${record.section}_${record.item}`;
          if (!itemMap[key]) {
            itemMap[key] = {
              _id: record.item,
              item_name: record.item_name,
              section_id: record.section,
              section_name: record.section_name,
              totalPiece: 0,
              records: 0
            };
          }
          itemMap[key].totalPiece += record.piece;
          itemMap[key].records += 1;
        });
        
        // Convert to array and sort by section name, then item name
        const sortedData = Object.values(itemMap).sort((a, b) => {
          if (a.section_name !== b.section_name) {
            return a.section_name.localeCompare(b.section_name);
          }
          return a.item_name.localeCompare(b.item_name);
        });
        
        updateMiddleColumnData(columnIndex, sortedData);
      }
    } catch (error) {
      console.error('Error fetching section data:', error);
    }
  };

  const fetchFinalProductData = async () => {
    try {
      const params = new URLSearchParams({
        fromDate: col5Filters.startDate,
        toDate: col5Filters.endDate,
      });
      
      // Add section filter for Final Product section
      if (finalProductSection) {
        params.append('section', finalProductSection._id);
      }
      
      if (col5Filters.selectedItems.length > 0) {
        params.append('items', col5Filters.selectedItems.join(','));
      }

      const response = await HTTP('GET', `/final-product?${params.toString()}`);
      if (response && response.counts) {
        // Map counts to include item names
        const countsWithNames = response.counts.map(count => ({
          _id: count._id,
          item_name: count.item_name || 'Unknown Item',
          totalPiece: count.totalPiece
        }));
        setCol5Data(countsWithNames);
      }
    } catch (error) {
      console.error('Error fetching final product data:', error);
    }
  };

  const updateMiddleColumnData = (index, data) => {
    setMiddleColumns(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], data };
      return updated;
    });
  };

  const updateMiddleColumnFilter = (index, key, value) => {
    setMiddleColumns(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const addMiddleColumn = () => {
    if (middleColumns.length >= 5) {
      toast.warning('Maximum 5 handwork columns allowed');
      return;
    }
    setMiddleColumns(prev => [
      ...prev,
      {
        id: Date.now(),
        startDate: moment().startOf('month').format('YYYY-MM-DD'),
        endDate: moment().endOf('month').format('YYYY-MM-DD'),
        selectedItems: [],
        selectedSection: null,
        data: []
      }
    ]);
  };

  const removeMiddleColumn = (index) => {
    if (middleColumns.length === 1) {
      toast.warning('At least one handwork column is required');
      return;
    }
    setMiddleColumns(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    const mainTitleFontSize = 18;
    const sectionFontSize = 14;
    const normalFontSize = 10;
    const titleColor = [52, 73, 94];
    const headerColor = [71, 85, 105];

    doc.setFontSize(mainTitleFontSize);
    doc.setTextColor(...titleColor);
    doc.text('Production Flow Report', 14, 20);

    doc.setFontSize(normalFontSize);
    doc.setTextColor(0, 0, 0);

    let yPos = 30;

    // In-Process Section
    doc.setFontSize(sectionFontSize);
    doc.setTextColor(...titleColor);
    doc.text('In-Process Items', 14, yPos);
    yPos += 5;

    const col1Total = col1Data.reduce((sum, item) => sum + item.totalPiece, 0);
    const inProcessData = col1Data.map(item => [
      item.item_name || 'N/A',
      item.totalPiece.toString()
    ]);
    inProcessData.push(['Total', col1Total.toString()]);

    doc.autoTable({
      startY: yPos,
      head: [['Item Name', 'Total Pieces']],
      body: inProcessData,
      theme: 'grid',
      headStyles: { fillColor: headerColor, fontSize: normalFontSize, fontStyle: 'bold' },
      bodyStyles: { fontSize: normalFontSize - 1 },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Section columns
    middleColumns.forEach((col, idx) => {
      if (col.selectedSection) {
        doc.setFontSize(sectionFontSize);
        doc.setTextColor(...titleColor);
        doc.text(`${col.selectedSection.label}`, 14, yPos);
        yPos += 5;

        const colTotal = col.data.reduce((sum, item) => sum + item.totalPiece, 0);
        const sectionData = col.data.map(item => [
          item.item_name || 'N/A',
          item.totalPiece.toString()
        ]);
        sectionData.push(['Total', colTotal.toString()]);

        doc.autoTable({
          startY: yPos,
          head: [['Item Name', 'Total Pieces']],
          body: sectionData,
          theme: 'grid',
          headStyles: { fillColor: headerColor, fontSize: normalFontSize, fontStyle: 'bold' },
          bodyStyles: { fontSize: normalFontSize - 1 },
          margin: { left: 14, right: 14 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }
    });

    // Final Products
    doc.setFontSize(sectionFontSize);
    doc.setTextColor(...titleColor);
    doc.text('Final Products (Completed)', 14, yPos);
    yPos += 5;

    const col5Total = col5Data.reduce((sum, item) => sum + item.totalPiece, 0);
    const finalProductData = col5Data.map(item => [
      item.item_name || 'N/A',
      item.totalPiece.toString()
    ]);
    finalProductData.push(['Total', col5Total.toString()]);

    doc.autoTable({
      startY: yPos,
      head: [['Item Name', 'Total Pieces']],
      body: finalProductData,
      theme: 'grid',
      headStyles: { fillColor: headerColor, fontSize: normalFontSize, fontStyle: 'bold' },
      bodyStyles: { fontSize: normalFontSize - 1 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`production_flow_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  const finalProductItems = items.filter(item => item.section === finalProductSection?._id);

  const sectionOptions = allSections.map(section => ({
    value: section._id,
    label: section.name
  }));

  const getColumnColor = (index) => {
    const colors = ['bg-purple-600', 'bg-indigo-600', 'bg-violet-600', 'bg-pink-600', 'bg-fuchsia-600'];
    return colors[index % colors.length];
  };

  // Format number with 2 decimals only if there are decimals
  const formatNumber = (num) => {
    if (!num) return '0';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  const renderColumn = (columnData, filters, setFilters, columnTitle, columnColor, showSectionFilter = false, columnIndex = null, useFilteredItems = false) => {
    const total = columnData.reduce((sum, item) => sum + item.totalPiece, 0);
    
    // Determine which items to show in dropdown
    let itemsToUse;
    if (useFilteredItems) {
      itemsToUse = finalProductItems;
    } else if (showSectionFilter && filters.selectedSection) {
      itemsToUse = items.filter(item => item.section === filters.selectedSection.value);
    } else {
      itemsToUse = items;
    }
    
    // Group data by section if section filter is not applied
    const isGroupedBySection = showSectionFilter && !filters.selectedSection && columnData.length > 0 && columnData[0].section_name;
    
    let groupedData = {};
    if (isGroupedBySection) {
      columnData.forEach(item => {
        if (!groupedData[item.section_name]) {
          groupedData[item.section_name] = [];
        }
        groupedData[item.section_name].push(item);
      });
    }
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col" style={{ minWidth: '280px', maxWidth: '320px' }}>
        <div className={`${columnColor} text-white px-4 py-3 flex justify-between items-center`}>
          <div>
            <h2 className="text-lg font-semibold">{columnTitle}</h2>
            <p className="text-sm opacity-90">Total: {formatNumber(total)} pieces</p>
          </div>
          {columnIndex !== null && (
            <button
              onClick={() => removeMiddleColumn(columnIndex)}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition"
              title="Remove column">
              <FaTimes size={16} />
            </button>
          )}
        </div>
        
        {/* Filters */}
        <div className="p-3 bg-gray-50 border-b space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={filters.startDate}
                onChange={e => {
                  if (columnIndex !== null) {
                    updateMiddleColumnFilter(columnIndex, 'startDate', e.target.value);
                  } else {
                    setFilters({ ...filters, startDate: e.target.value });
                  }
                }}
                className="flex-1 text-xs border border-gray-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={e => {
                  if (columnIndex !== null) {
                    updateMiddleColumnFilter(columnIndex, 'endDate', e.target.value);
                  } else {
                    setFilters({ ...filters, endDate: e.target.value });
                  }
                }}
                className="flex-1 text-xs border border-gray-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {showSectionFilter && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
              <Select
                options={sectionOptions}
                value={filters.selectedSection}
                onChange={selected => {
                  if (columnIndex !== null) {
                    updateMiddleColumnFilter(columnIndex, 'selectedSection', selected);
                  }
                }}
                className="text-xs"
                classNamePrefix="select"
                placeholder="All sections..."
                isClearable
                styles={{
                  control: (base) => ({ ...base, minHeight: '28px', fontSize: '12px' }),
                  menu: (base) => ({ ...base, fontSize: '12px' })
                }}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Items</label>
            <ItemSelectWithImage
              isMulti
              items={itemsToUse}
              value={filters.selectedItems}
              onChange={selected => {
                if (columnIndex !== null) {
                  updateMiddleColumnFilter(columnIndex, 'selectedItems', selected);
                } else {
                  setFilters({ ...filters, selectedItems: selected });
                }
              }}
              className="text-xs"
              placeholder="All items..."
              noOptionsMessage="No items"
              styles={{
                control: (base) => ({ ...base, minHeight: '28px', fontSize: '12px' }),
                menu: (base) => ({ ...base, fontSize: '12px' })
              }}
            />
          </div>
        </div>
        
        {/* Data */}
        <div className="p-3 flex-1" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {columnData.length > 0 ? (
            isGroupedBySection ? (
              // Grouped by section view
              <div className="space-y-4">
                {Object.keys(groupedData).map((sectionName, sectionIdx) => (
                  <div key={sectionIdx} className="border-l-4 border-blue-400 pl-2">
                    <h3 className="font-semibold text-sm text-gray-800 mb-2 sticky top-0 bg-white py-1">
                      {sectionName}
                      <span className="ml-2 text-xs font-normal text-gray-600">
                        ({formatNumber(groupedData[sectionName].reduce((sum, item) => sum + item.totalPiece, 0))} pcs)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {groupedData[sectionName].map((item, itemIdx) => (
                        <div key={itemIdx} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition">
                          <div className="font-medium text-sm text-gray-800">{item.item_name || 'N/A'}</div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Pieces: {formatNumber(item.totalPiece)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Regular list view
              <div className="space-y-2">
                {columnData.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition">
                    <div className="font-medium text-sm text-gray-800">{item.item_name || 'N/A'}</div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Pieces: {formatNumber(item.totalPiece)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">
              No items found
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Production Flow Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">Track items through production stages</p>
          </div>
          <div className="flex gap-2">
            {middleColumns.length < 5 && (
              <button
                onClick={addMiddleColumn}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
                <FaPlus /> Add Handwork Column
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
              <FaDownload /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Dynamic Columns */}
      <div className="p-6">
        <div 
          className="flex gap-4 mx-auto" 
          style={{ 
            minWidth: 'max-content',
            maxWidth: '100%',
            justifyContent: middleColumns.length <= 2 ? 'center' : 'flex-start'
          }}>
          {/* Column 1: In-Process Items */}
          {renderColumn(col1Data, col1Filters, setCol1Filters, 'In-Process Items', 'bg-blue-600', false, null, true)}
          
          {/* Middle Columns (Dynamic) */}
          {middleColumns.map((col, index) => {
            // Use section name if selected, otherwise use generic name
            const columnTitle = col.selectedSection 
              ? col.selectedSection.label 
              : `Handwork Section ${index + 1}`;
            
            return renderColumn(
              col.data,
              col,
              null,
              columnTitle,
              getColumnColor(index),
              true,
              index,
              false
            );
          })}
          
          {/* Column 5: Final Products */}
          {renderColumn(col5Data, col5Filters, setCol5Filters, 'Final Products', 'bg-green-600', false, null, true)}
        </div>
      </div>

      {/* Summary Section */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-auto gap-4" style={{ gridTemplateColumns: `repeat(${2 + middleColumns.length}, minmax(0, 1fr))` }}>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">In-Process</div>
              <div className="text-2xl font-bold text-blue-800 mt-1">
                {formatNumber(col1Data.reduce((sum, item) => sum + item.totalPiece, 0))}
              </div>
              <div className="text-xs text-blue-600 mt-1">{col1Data.length} items</div>
            </div>
            
            {middleColumns.map((col, index) => (
              <div key={col.id} className={`${getColumnColor(index).replace('bg-', 'bg-opacity-10 bg-')} rounded-lg p-4`}>
                <div className={`text-sm ${getColumnColor(index).replace('bg-', 'text-')} font-medium`}>
                  {col.selectedSection ? col.selectedSection.label : `Section ${index + 1}`}
                </div>
                <div className={`text-2xl font-bold ${getColumnColor(index).replace('bg-', 'text-').replace('-600', '-800')} mt-1`}>
                  {formatNumber(col.data.reduce((sum, item) => sum + item.totalPiece, 0))}
                </div>
                <div className={`text-xs ${getColumnColor(index).replace('bg-', 'text-')} mt-1`}>
                  {col.data.length} items
                </div>
              </div>
            ))}
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Completed</div>
              <div className="text-2xl font-bold text-green-800 mt-1">
                {formatNumber(col5Data.reduce((sum, item) => sum + item.totalPiece, 0))}
              </div>
              <div className="text-xs text-green-600 mt-1">{col5Data.length} items</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
