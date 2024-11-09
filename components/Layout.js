import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Layout = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log("token", token);
    if (token) {
      axios
        .get('/api/validateToken', { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user)); // Store user data after fetching
        })
        .catch((error) => {
          console.error("Token validation failed:", error); // Log error for debugging
          localStorage.removeItem('token'); // Remove token on error
        });
    }
  }, [router]); // Only depend on router

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    router.push('/login');
  };

  return (
    <div>
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
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
          {
            user && router.pathname !== '/billing' && (
              <li>
              <Link href="/billing">
                <div className="hover:underline">Payables</div>
              </Link>
            </li>
            )
          }
          {user && router.pathname !== '/settings' && (
            <li>
              <Link href="/settings">
                <div className="hover:underline">Settings</div>
              </Link>
            </li>
          )}
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
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
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
