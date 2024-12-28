import moment from 'moment';
import { HTTP } from '../actions/actions_creators';
import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import { FaEdit, FaSave, FaTrash } from 'react-icons/fa';
export default function InOutPlattingComponent(props) {
  const { count, plattingType, newlyAddedPlatting } = props;
  const [plattingDetails, setPlattingDetails] = useState([]);
  const [startDate, setStartDate] = useState(moment().startOf('day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().endOf('day').format('YYYY-MM-DD'));
  const [totalWeight, setTotalWeight] = useState(0);
  const [isEditing, setIsEditing] = useState(null);
  const fetchPlattingDetails = async () => {
    const response = await HTTP('GET', '/platting', {
      type: plattingType,
      fromDate: startDate,
      toDate: endDate,
    });
    setPlattingDetails(response.data);
  };
  useEffect(() => {
    fetchPlattingDetails();
    getTotalWeight();
  }, [count, startDate, endDate]);

  const handleScroll = () => {
    console.log('scrolled');
  };

  const getTotalWeight = async () => {
    const response = await HTTP('POST', '/platting/count', {
      type: plattingType,
      fromDate: startDate,
      toDate: endDate,
    });
    setTotalWeight(response?.[plattingType] || 0);
  };
  const handleDelete = async id => {
    const response = await HTTP('DELETE', `/platting?id=${id}`);
    fetchPlattingDetails();
    getTotalWeight();
  };
  const handleEditWeight = async weight => {
    plattingDetails.forEach(detail => {
      if (detail._id === isEditing._id) {
        detail.weight = weight;
      }
    });
    setIsEditing(prev => ({ ...prev, weight }));
  };
  const handleEditDetails = async details => {
    plattingDetails.forEach(detail => {
      if (detail._id === isEditing._id) {
        detail.details = details;
      }
    });
    setIsEditing(prev => ({ ...prev, details }));
  };

  const handleSave = async id => {
    const response = await HTTP('PUT', `/platting?id=${id}`, {
      _id: id,
      weight: isEditing.weight,
      details: isEditing.details,
    });
    fetchPlattingDetails();
    getTotalWeight();
    setIsEditing(null);
  };
  return (
    <div className="m-1 p-1">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full ">
        <div className="flex flex-col md:flex-row justify-between items-center p-4">
          <h2 className="text-2xl font-bold mb-2">
            {' '}
            {_.startCase(plattingType.toLowerCase())}
            <span className="text-gray-500 border border-gray-500 rounded-md px-2 py-1 m-1 font-bold">
              {totalWeight?.toFixed(2)} KG{' '}
            </span>
          </h2>

          <div className="flex flex-col md:flex-row justify-center space-y-2 md:space-y-0 md:space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg focus:outline-none focus:ring-2 p-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg focus:outline-none focus:ring-2 p-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div
          className="overflow-x-auto"
          style={{ maxHeight: '70vh', overflowY: 'scroll' }}
          id="scrollable-container"
          onScroll={handleScroll}>
          <table className="min-w-full bg-white">
            <thead className="sticky top-0">
              <tr className="bg-gray-100 p-4 font-medium text-gray-700">
                <th className="px-4 py-2 text-left">Weight</th>
                <th className="px-4 py-2 text-left">Details</th>
                <th className="px-4 py-2 text-left">Submitted On</th>
                <th className="px-4 py-2 text-left">Submitted By</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {plattingDetails?.length > 0 ? (
                plattingDetails.map(detail => (
                  <tr key={detail._id} className="border-b last:border-none text-gray-700">
                    <td className="px-4 py-2">
                      {isEditing?._id === detail._id ? (
                        <input
                          type="number"
                          className="border border-gray-300 rounded-lg focus:outline-none focus:ring-2 p-2 focus:ring-blue-500 w-32"
                          value={detail.weight}
                          onChange={e => handleEditWeight(e.target.value, detail._id)}
                          onBlur={() => handleSave(detail._id)}
                        />
                      ) : (
                        detail.weight
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing?._id === detail._id ? (
                        <input
                          type="text"
                          value={detail.details}
                          onChange={e => handleEditDetails(e.target.value, detail._id)}
                          onBlur={() => handleSave(detail._id)}
                          className="border border-gray-300 rounded-lg focus:outline-none focus:ring-2 p-2 max-w-lg focus:ring-blue-500 w-32"
                        />
                      ) : (
                        detail.details
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {detail.createdAt ? moment(detail.createdAt).format('LLL') : ''}
                    </td>
                    <td className="px-4 py-2">{detail.lastModifiedBy?.name}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        onClick={() => isEditing?._id === detail._id ? setIsEditing(null) : setIsEditing(detail)}>
                        <FaEdit />
                      </button>

                      <button
                        className="bg-red-500 text-white px-4 py-2 rounded-md"
                        onClick={() => handleDelete(detail._id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-4 text-gray-500 text-center">
                    No Platting Details found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
