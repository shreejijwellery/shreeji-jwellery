import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { USER_ROLES } from '../lib/constants';

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
    <div className="flex justify-center w-full">
      {user && user.role === USER_ROLES.ADMIN && <PayableDashboard />}
    </div>
  );
};

export default Home;
