import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';

const Home = () => {
  return (
    <div className="flex justify-center">
      <PayableDashboard />
    </div>
  );
};

export default Home;
