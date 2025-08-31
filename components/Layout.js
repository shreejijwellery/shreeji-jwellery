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
        <ul className="flex space-x-4 text-white">
          {router.pathname !== '/' && (
            <li>
              <Link href="/">
                <div className="hover:underline">Home</div>
              </Link>
            </li>
          )}
          {!user && router.pathname !== '/signup' && (
            <li>
              <Link href="/signup">
                <div className="hover:underline">Signup</div>
              </Link>
            </li>
          )}
          {!user && router.pathname !== '/login' && (
            <li>
              <Link href="/login">
                <div className="hover:underline">Login</div>
              </Link>
            </li>
          )}
          {user &&
            checkPermission(user, PERMISSIONS.PARTY_BILLS) &&
            router.pathname !== '/party-billing' && (
              <li>
                <Link href="/party_dashboard">
                  <div className="hover:underline">Vendor Pay</div>
                </Link>
              </li>
            )}
          {user && router.pathname !== '/billing' && checkPermission(user, PERMISSIONS.WORKER_BILLS) && (
            <li>
              <Link href="/billing">
                <div className="hover:underline"> Worker Pay</div>
              </Link>
            </li>
          )}

          {user && router.pathname !== '/settings' && (
            <li>
              <Link href="/settings">
                <div className="hover:underline">Settings</div>
              </Link>
            </li>
          )}
          {
            user && router.pathname !== '/final-product' && checkPermission(user, PERMISSIONS.FINAL_PRODUCT) && (
              <li>
              <Link href="/final-product">
                <div className="hover:underline">Final Product</div>
              </Link>
            </li>
            )
          }
                    {
            user && router.pathname !== '/platting' && checkPermission(user, PERMISSIONS.PLATTING) && (
              <li>
              <Link href="/platting">
                <div className="hover:underline">Platting</div>
              </Link>
            </li>
            )
          }
          {/* {user && router.pathname !== '/extract-sku' && (
            <li>
              <Link href="/extract-sku">
                <div className="hover:underline">Extract SKU</div>
              </Link>
            </li>
          )} */}
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
