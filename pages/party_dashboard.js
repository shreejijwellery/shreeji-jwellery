import React, { useEffect, useState } from 'react';
import WorkerBills from '../components/workerbills';
import PartyDropDown from '../components/party_dropdown';
import PartyBills from '../components/partyBills';
import axios from 'axios';

export default function MainPage() {
  const [selectedWorker, setSelectedWorker] = useState(null); // Shared state for selected worker
  const [user, setUser] = useState(null);
  const [totalCounts, setTotalCounts] = useState(null);
  const [isBillModified, setIsBillModified] = useState([]);
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchTotalCounts();
    }

  }, [isBillModified]);

  const fetchTotalCounts = async () => {
    const response = await axios.get(`/api/vendor-bills/counts`);
    console.log("party dashboard:",response.data.data);
    setTotalCounts(response.data.data);
  };
  return (
    <div className=" mx-auto p-4">
      {/* Main Page Layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar for PartyDropDown */}
        <div className="w-full md:w-1/4 bg-white shadow-lg rounded-lg p-4">
          <PartyDropDown setSelectedWorker={setSelectedWorker} totalCounts={totalCounts} />
        </div>

        {/* Right Content for WorkerBills */}
        <div className="w-full md:w-3/4">
          <PartyBills selectedParty={selectedWorker}  user={user} isBillModified={isBillModified} setIsBillModified={setIsBillModified}/>
        </div>
      </div>
    </div>
  );
}