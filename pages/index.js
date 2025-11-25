import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { checkPermission, PERMISSIONS, USER_ROLES } from '../lib/constants';

const Home = () => {
  const [user, setUser] = useState(null);
  const router = useRouter();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setUser(user);
    if (!user) {
      router.push('/login');
    }
  }, []);
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto">
        {user && checkPermission(user, PERMISSIONS.WORKER_BILLS) && <PayableDashboard />}
      </div>
    </div>
  );
};

export default Home;
