import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';
import { checkPermission, PERMISSIONS, USER_ROLES } from '../lib/constants';
import { useFeatureFlags } from '../utils/useFeatureFlags';

const Home = () => {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { checkFeature, loading: flagsLoading } = useFeatureFlags();
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch full user data
    axios
      .get('/api/validateToken', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        const fullUser = response.data.user;
        setUser(fullUser);
        localStorage.setItem('user', JSON.stringify(fullUser));
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  if (flagsLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4">Loading...</div>;
  }

  // Check if Dashboard feature flag is enabled
  if (!checkFeature('isDashboard')) {
    // If Dashboard is disabled, redirect users who only have SKU permission
    const hasPermissionsBeyondSKU = () => {
      if (user.role === USER_ROLES.ADMINISTRATOR) return true;
      const permissions = user.permissions || [];
      const nonSKUPermissions = [
        PERMISSIONS.PARTY_BILLS,
        PERMISSIONS.WORKER_BILLS,
        PERMISSIONS.SECTIONS,
        PERMISSIONS.ITEMS,
        PERMISSIONS.VENDORS,
        PERMISSIONS.WORKERS,
        PERMISSIONS.FINAL_PRODUCT,
        PERMISSIONS.IN_PROCESS_PRODUCT,
        PERMISSIONS.PLATTING,
        PERMISSIONS.PRODUCTION_FLOW
      ];
      return nonSKUPermissions.some(perm => permissions.includes(perm));
    };

    if (!hasPermissionsBeyondSKU() && user.permissions?.includes(PERMISSIONS.EXTRACT_SKU)) {
      router.push('/extract-sku');
      return <div className="p-4">Redirecting...</div>;
    }

    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Feature Not Available</h2>
          <p className="text-yellow-700">Dashboard is not enabled for your company. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // Dashboard is enabled - show it regardless of permissions
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto">
        {user && checkPermission(user, PERMISSIONS.WORKER_BILLS) && <PayableDashboard user={user} />}
      </div>
    </div>
  );
};

export default Home;
