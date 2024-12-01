import React, { useEffect, useState } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip'; // Use named import for Tooltip

const ItemOptionsForFinalProduct = props => {
  const { items, selectedItems, setSelectedItems, productsCounts } = props;
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState(items);


    useEffect(() => {
        const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredItems(filteredItems);
    }, [searchTerm, items]);

    const handleSelectionChange = (itemId) => {
      setSelectedItems(prevSelectedItems => 
        prevSelectedItems.includes(itemId) 
          ? prevSelectedItems.filter(id => id !== itemId) 
          : [...prevSelectedItems, itemId]
      );
    };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Select an Item</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search by name"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="h-max overflow-y-auto">
      <div className='font-bold' >Total Items : {productsCounts.reduce((acc, item) => acc + item.totalPiece, 0)}</div>
      <div className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
            <input
              type="checkbox"
              id="all-selection"
              name="item"
              value=""
              checked={selectedItems.length === filteredItems.length}
              onChange={() => {
                 setSelectedItems(selectedItems.length === filteredItems.length ? [] :filteredItems.map(item => item._id));
              }}
              className="focus:ring-blue-500 text-blue-600"
            />
            <label htmlFor="all-selection" className="text-gray-700">
              {selectedItems.length === filteredItems.length? "Unselect All" :"Select All"}
            </label>
          </div>
        
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const itemCounts = productsCounts?.find(i => i._id ==  item._id )?.totalPiece
            return (
            <div
              key={item._id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
              <input
                type="checkbox"
                id={item._id}
                name="item"
                value={item._id}
                checked={selectedItems.includes(item._id)}
                onChange={() => handleSelectionChange(item._id)}
                className="focus:ring-blue-500 text-blue-600"
              />
              <label
                data-tooltip-id={`item-${item._id}`}
                htmlFor={item._id}
                className="text-gray-700"
              >
                {item.name} ({itemCounts})
              </label>
              
              <ReactTooltip id={`item-${item._id}`} place="top" effect="solid">
                <div>
                  <strong>Price:</strong> {item.price}<br />
                  <strong>Quantity:</strong> {item.quantity}
                </div>  
              </ReactTooltip>
            </div>
          )})
        ) : (
          <p className="text-gray-500 text-sm text-center">No items found</p>
        )}
      </div>
    </div>
  );
};

export default ItemOptionsForFinalProduct;
