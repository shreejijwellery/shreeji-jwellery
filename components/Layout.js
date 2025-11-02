import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { checkPermission, PERMISSIONS, USER_ROLES } from '../lib/constants';
import { CgProfile  } from 'react-icons/cg';
import { FaUsersCog } from "react-icons/fa";
const Layout = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {

  const token = localStorage.getItem('token');
    if (token) {
      axios
        .get('/api/validateToken', { headers: { Authorization: `Bearer ${token}` } })
        .then(response => {
          delete response.data?.user?.password;
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user)); // Store user data after fetching
          
        })
        .catch(error => {
          console.error('Token validation failed:', error); // Log error for debugging
          localStorage.removeItem('token'); // Remove token on error
        });
    }else {
      if (router.pathname !== '/login' && router.pathname !== '/signup') {
        router.push('/login');
      }
    }
  }, [router]); // Only depend on router

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    router.push('/login');
  };

  return (
    <div>
      <nav className="bg-gray-800 p-4 flex flex-col md:flex-row overflow-x-scroll justify-between items-center">
        <ul className="flex space-x-2 text-white">
          <li>
            <Link href="/">
              <div className={`px-3 py-2 rounded transition ${
                router.pathname === '/' 
                  ? 'bg-blue-600 font-semibold' 
                  : 'hover:bg-gray-700'
              }`}>
                Home
              </div>
            </Link>
          </li>
          {!user && (
            <>
              <li>
                <Link href="/signup">
                  <div className={`px-3 py-2 rounded transition ${
                    router.pathname === '/signup' 
                      ? 'bg-blue-600 font-semibold' 
                      : 'hover:bg-gray-700'
                  }`}>
                    Signup
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/login">
                  <div className={`px-3 py-2 rounded transition ${
                    router.pathname === '/login' 
                      ? 'bg-blue-600 font-semibold' 
                      : 'hover:bg-gray-700'
                  }`}>
                    Login
                  </div>
                </Link>
              </li>
            </>
          )}
          {user && checkPermission(user, PERMISSIONS.PARTY_BILLS) && (
            <li>
              <Link href="/party_dashboard">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/party_dashboard' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Vendor Pay
                </div>
              </Link>
            </li>
          )}
          {user && checkPermission(user, PERMISSIONS.WORKER_BILLS) && (
            <li>
              <Link href="/billing">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/billing' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Worker Pay
                </div>
              </Link>
            </li>
          )}
          {user && user.role !== USER_ROLES.ADMINISTRATOR && (
            <li>
              <Link href="/settings">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/settings' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Settings
                </div>
              </Link>
            </li>
          )}
          {user && checkPermission(user, PERMISSIONS.FINAL_PRODUCT) && (
            <li>
              <Link href="/final-product">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/final-product' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Final Product
                </div>
              </Link>
            </li>
          )}
          {user && checkPermission(user, PERMISSIONS.IN_PROCESS_PRODUCT) && (
            <li>
              <Link href="/in-process-product">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/in-process-product' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  In-Process
                </div>
              </Link>
            </li>
          )}
          {user && checkPermission(user, PERMISSIONS.PLATTING) && (
            <li>
              <Link href="/platting">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/platting' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Platting
                </div>
              </Link>
            </li>
          )}
          {user && user.role !== USER_ROLES.ADMINISTRATOR && checkPermission(user, PERMISSIONS.EXTRACT_SKU) && (
            <li>
              <Link href="/extract-sku">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/extract-sku' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Extract SKU
                </div>
              </Link>
            </li>
          )}
          {user && checkPermission(user, PERMISSIONS.PRODUCTION_FLOW) && (
            <li>
              <Link href="/production-flow">
                <div className={`px-3 py-2 rounded transition ${
                  router.pathname === '/production-flow' 
                    ? 'bg-blue-600 font-semibold' 
                    : 'hover:bg-gray-700'
                }`}>
                  Production Flow
                </div>
              </Link>
            </li>
          )}
          {/* Uncomment if needed
          {user && router.pathname !== '/dashboard' && (
            <li>
              <Link href="/dashboard">
                <div className="hover:underline">Dashboard</div>
              </Link>
            </li>
          )}
          {user && router.pathname !== '/calendar' && (
            <li>
              <Link href="/calendar">
                <div className="hover:underline">Calendar</div>
              </Link>
            </li>
          )} */}
        </ul>
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-white">{user.name}</span>
            <span className="text-white cursor-pointer" onClick={() => router.push('/profile')}> <CgProfile /> </span>
            {user.role === USER_ROLES.ADMIN && (
              <span
                onClick={() => router.push('/user-permissions')}
                className="text-white cursor-pointer">
                  <FaUsersCog />
              </span>
            )}
            {user.role === USER_ROLES.ADMINISTRATOR && (
              <span
                onClick={() => router.push('/admin')}
                className="text-white cursor-pointer">
                  <FaUsersCog />
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              Logout
            </button>
          </div>
        )}
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
};

export default Layout;
