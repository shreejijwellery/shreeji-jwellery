import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

const Home = () => {
  const [user, setUser] = useState(null);
  const router = useRouter();
  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('user')));
    if (!user) {
      router.push('/login');
    }
  }, []);
  return (
    <div className="flex justify-center">
      {user && user.role === 'worker' && <PayableDashboard />}
    </div>
  );
};

export default Home;
