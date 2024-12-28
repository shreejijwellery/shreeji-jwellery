import React, { useState, useEffect } from 'react';
import { PLATTING_TYPES } from '../lib/constants';
import { FaSave } from 'react-icons/fa';
import Select from 'react-select';
import { HTTP } from '../actions/actions_creators';
import InOutPlattingComponent from '../components/InOutPlattingComponent';

export default function Platting(props) {
    const plattingTypes = Object.values(PLATTING_TYPES);
    const plattingTypesOptions = plattingTypes.map(type => ({
        value: type,
        label: type,
    }));
    const [type, setType] = useState(plattingTypesOptions[0].value);
    const [weight, setWeight] = useState('');
    const [details, setDetails] = useState('');
    const [newlyAddedPlatting, setNewlyAddedPlatting] = useState('');
    const [counts, setCounts] = useState({});
    const handleSubmit = async () => {
        const response = await HTTP('POST', '/platting', { type : type, weight : weight, details : details });
        setNewlyAddedPlatting(response.type);
        getCounts();
    }

    const getCounts = async () => {
        const response = await HTTP('GET', '/platting/count');
        setCounts(response);
    }

    useEffect(() => {
        getCounts();
    }, []);
    
    return (
        <div className='h-full'>
        <div className="flex flex-col md:flex-row justify-between items-center mb-2 px-4 py-2">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2 md:mb-0">Platting</h2>
        </div>
        <div className="flex flex-col md:flex-row justify-center bg-gray-100 ">

          <div className="flex flex-col p-4 w-full  h-full">
            {/* Add New Record Form */}
            <div className="flex flex-col md:flex-row justify-center mb-4 space-y-2 md:space-y-0 md:space-x-2">
              <Select
                options={plattingTypesOptions}
                value={plattingTypesOptions.find(option => option.value === type)}
                onChange={option => setType(option.value)}
                className="basic-single w-full md:w-64"
                classNamePrefix="select"
                placeholder="Select Platting Type"
              />
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter weight"
              />
              <input
                type="text"
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter details"
              />
              <button
                onClick={handleSubmit}
                className="bg-blue-600 flex items-center  justify-center text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <FaSave className='mr-2' /> Submit
              </button>
            </div>
            <div className='flex flex-col md:flex-row justify-center'>
           {
             plattingTypes.map(plattingType => (
                <InOutPlattingComponent count={counts[plattingType]} plattingType={plattingType} newlyAddedPlatting={newlyAddedPlatting} />
             ))
           } 
           </div>
          </div>
        </div>
      </div>
    )
}