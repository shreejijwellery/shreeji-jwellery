import React, { useState } from 'react';
import WorkerBills from '../components/workerbills';
import WorkerDropdown from '../components/worker_dropdown';
import { useFeatureFlags } from '../utils/useFeatureFlags';

export default function MainPage() {
  const [selectedWorker, setSelectedWorker] = useState(null); // Shared state for selected worker
  const { checkFeature, loading: flagsLoading } = useFeatureFlags();

  if (flagsLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!checkFeature('isWorkerBills') && !checkFeature('isWorkerPayments')) {
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
    <div className="container mx-auto p-4">
      {/* Main Page Layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar for WorkerDropdown */}
        <div className="w-full md:w-1/4 bg-white shadow-lg rounded-lg p-4">
          <WorkerDropdown setSelectedWorker={setSelectedWorker} />
        </div>

        {/* Right Content for WorkerBills */}
        <div className="w-full md:w-3/4">
          <WorkerBills selectedWorker={selectedWorker} />
        </div>
      </div>
    </div>
  );
}
