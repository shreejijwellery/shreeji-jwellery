import Link from 'next/link';
import PayableDashboard from '../components/worker_dashboard';
import LandingPage from '../components/LandingPage';
import SEO from '../components/SEO';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';
import { checkPermission, PERMISSIONS, USER_ROLES } from '../lib/constants';
import { useFeatureFlags } from '../utils/useFeatureFlags';

const LANDING_TITLE = 'SellerOS – Smart PDF sorting for Meesho, Snapdeal & Amazon';
const LANDING_DESCRIPTION = 'Sort order PDFs in seconds. Credit-based, secure, built for Indian sellers. Start with free credits—no card required.';

const Home = () => {
  const [user, setUser] = useState(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const router = useRouter();
  const { checkFeature, loading: flagsLoading } = useFeatureFlags();
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setHasCheckedAuth(true);
      return;
    }

    // Fetch full user data
    axios
      .get('/api/validateToken', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        const fullUser = response.data.user;
        setUser(fullUser);
        localStorage.setItem('user', JSON.stringify(fullUser));
        setHasCheckedAuth(true);
      })
      .catch(() => {
        setHasCheckedAuth(true);
      });
  }, []);

  // Initial render (server + first client paint): show landing so HTML matches (avoids hydration error)
  if (!hasCheckedAuth) {
    return (
      <>
        <SEO title={LANDING_TITLE} description={LANDING_DESCRIPTION} canonicalPath="/" />
        <LandingPage />
      </>
    );
  }

  // Auth checked, no user: show landing (no token) or redirect (invalid token)
  if (!user) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return (
        <>
          <SEO title={LANDING_TITLE} description={LANDING_DESCRIPTION} canonicalPath="/" />
          <LandingPage />
        </>
      );
    }
    router.push('/login');
    return <div className="p-4 flex items-center justify-center min-h-[40vh]">Redirecting...</div>;
  }

  if (flagsLoading) {
    return <div className="p-4 flex items-center justify-center min-h-[40vh]">Loading...</div>;
  }

  // User can access SKU Management (admin, ADMINISTRATOR, or manager with sort flags)
  const canAccessSku = (checkPermission(user, PERMISSIONS.EXTRACT_SKU) || user.role === USER_ROLES.MANAGER) &&
    (checkFeature('isExtractSKU') || checkFeature('isMeeshoSort') || checkFeature('isSnapdealSort') || checkFeature('isAmazonSort'));

  // Home has no content when: dashboard disabled, or dashboard enabled but no Worker Bills (only PayableDashboard is shown)
  const homeHasNoContent = !checkFeature('isDashboard') ||
    (checkFeature('isDashboard') && !checkPermission(user, PERMISSIONS.WORKER_BILLS));

  if (canAccessSku && homeHasNoContent) {
    router.replace('/extract-sku');
    return <div className="p-4">Loading...</div>;
  }

  if (!checkFeature('isDashboard')) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Feature Not Available</h2>
          <p className="text-yellow-700">Dashboard is not enabled for your company. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto">
        {user && checkPermission(user, PERMISSIONS.WORKER_BILLS) && <PayableDashboard user={user} />}
      </div>
    </div>
  );
};

export default Home;
