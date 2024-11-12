import React, { useState } from 'react';
import WorkerBills from '../components/workerbills';
import PartyDropDown from '../components/party_dropdown';
import PartyBills from '../components/partyBills';

export default function MainPage() {
  const [selectedWorker, setSelectedWorker] = useState(null); // Shared state for selected worker

  return (
    <div className="container mx-auto p-4">
      {/* Main Page Layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar for PartyDropDown */}
        <div className="w-full md:w-1/4 bg-white shadow-lg rounded-lg p-4">
          <PartyDropDown setSelectedWorker={setSelectedWorker} />
        </div>

        {/* Right Content for WorkerBills */}
        <div className="w-full md:w-3/4">
          <PartyBills selectedParty={selectedWorker} />
        </div>
      </div>
    </div>
  );
}