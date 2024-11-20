import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import { useEffect, useState } from 'react';

const Home = () => {
  return (
    <div className="flex justify-center">
      <PayableDashboard />
    </div>
  );
};

export default Home;
