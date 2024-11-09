import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import ExtractSKU from './extract-sku';

const Home = () => {
  return (
    <div className="flex justify-center">
      <ExtractSKU />
    </div>
  );
};

export default Home;
