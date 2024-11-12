import React, { useEffect, useState } from 'react';
import { fetchAllParties } from '../actions/actions_creators';
import { Tooltip as ReactTooltip } from 'react-tooltip'; // Use named import for Tooltip

const PartyDropdown = props => {
  const { setSelectedWorker } = props;
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetchAllParties();
        setWorkers(response);
      } catch (error) {
        console.error('Error fetching workers:', error);
      }
    };

    fetchWorkers();
  }, []);

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Select a Worker</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search by name"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Worker List */}
      <div className="max-h-60 overflow-y-auto">
        {selectedWorkerId !== null && (
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
            <input
              type="radio"
              id="no-selection"
              name="worker"
              value=""
              checked={selectedWorkerId === null}
              onChange={() => {
                setSelectedWorkerId(null);
                setSelectedWorker(null);
              }}
              className="focus:ring-blue-500 text-blue-600"
            />
            <label htmlFor="no-selection" className="text-gray-700">
              Clear Selection
            </label>
          </div>
        )}
        {/* <div className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
          <input
            type="radio"
            id="select-all"
            name="worker"
            value="all"
            checked={selectedWorkerId === "all"}
            onChange={() => {
              setSelectedWorkerId("all");
              setSelectedWorker({_id : "all"});
            }}
            className="focus:ring-blue-500 text-blue-600"
          />
          <label htmlFor="select-all" className="text-gray-700">
            Select All
          </label>
        </div> */}
        {filteredWorkers.length > 0 ? (
          filteredWorkers.map(worker => (
            <div
              key={worker._id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
              <input
                type="radio"
                id={worker._id}
                name="worker"
                value={worker._id}
                checked={selectedWorkerId === worker._id}
                onChange={() => {
                  setSelectedWorkerId(worker._id);
                  setSelectedWorker(worker);
                }}
                className="focus:ring-blue-500 text-blue-600"
              />
              <label
                data-tooltip-id={`worker-${worker._id}`}
                htmlFor={worker._id}
                className="text-gray-700"
              >
                {worker.name}
              </label>
              
          
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm text-center">No workers found</p>
        )}
      </div>
    </div>
  );
};

export default PartyDropdown;
