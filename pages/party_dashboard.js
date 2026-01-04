import React, { useEffect, useState } from 'react';
import PartyDropDown from '../components/party_dropdown';
import PartyBills from '../components/partyBills';
import { HTTP } from '../actions/actions_creators';
import { useFeatureFlags } from '../utils/useFeatureFlags';

export default function MainPage() {
  const [selectedWorker, setSelectedWorker] = useState(null); // Shared state for selected worker
  const [user, setUser] = useState(null);
  const [totalCounts, setTotalCounts] = useState(null);
  const [isBillModified, setIsBillModified] = useState([]);
  const { checkFeature, loading: flagsLoading } = useFeatureFlags();

  const fetchTotalCounts = async () => {
    const response = await HTTP('GET',`/vendor-bills/counts`);
    setTotalCounts(response.data);
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchTotalCounts();
    }
  }, [isBillModified]);

  if (flagsLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!checkFeature('isPartyBills') && !checkFeature('isVendorBills')) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Feature Not Available</h2>
          <p className="text-yellow-700">This feature is not enabled for your company. Please contact your administrator.</p>
        </div>
      </div>
    );
  }
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