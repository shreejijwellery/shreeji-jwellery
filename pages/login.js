import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import axios from 'axios';
import { HTTP } from '../actions/actions_creators';
import Link from 'next/link';
import SEO from '../components/SEO';
import OMSLogo from '../components/OMSLogo';
import { PERMISSIONS, USER_ROLES } from '../lib/constants';
import { clearFlagsCache } from '../utils/useFeatureFlags';
import { FaUser, FaLock, FaArrowRight, FaTruck, FaBoxes, FaWarehouse, FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await HTTP('POST', '/login', formData);
      if (response?.token) {
        // Clear old flags cache on login
        clearFlagsCache();
        
        localStorage.setItem('token', response.token);
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        
          // Fetch full user data and feature flags to check permissions
          try {
            const [userResponse, flagsResponse] = await Promise.all([
              axios.get('/api/validateToken', {
                headers: { Authorization: `Bearer ${response.token}` }
              }),
              axios.get('/api/company/flags', {
                headers: { Authorization: `Bearer ${response.token}` }
              })
            ]);
            const fullUser = userResponse.data.user;
            const featureFlags = flagsResponse.data?.featureFlags || {};
            localStorage.setItem('user', JSON.stringify(fullUser));
            
            // Cache the flags immediately
            const cacheData = {
              flags: featureFlags,
              timestamp: Date.now()
            };
            localStorage.setItem('featureFlags_cache', JSON.stringify(cacheData));
            
            // Dispatch event to notify components that user logged in
            window.dispatchEvent(new Event('userLoggedIn'));
            
            // Check if user only has SKU permission
            const hasPermissionsBeyondSKU = () => {
              if (fullUser.role === USER_ROLES.ADMINISTRATOR) return true;
              const permissions = fullUser.permissions || [];
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
            
            toast.success('Login successful!');
            setTimeout(() => {
              // Helper function to check if user has permission
              const hasPermission = (permission) => {
                if (fullUser.role === USER_ROLES.ADMIN || fullUser.role === USER_ROLES.ADMINISTRATOR) return true;
                return fullUser.permissions?.includes(permission) || false;
              };

              // Determine first available navigation item based on permissions and feature flags
              let redirectPath = '/';
              
              // Check navigation items in order of priority
              if (Boolean(featureFlags.isDashboard)) {
                redirectPath = '/';
              } else if (hasPermission(PERMISSIONS.EXTRACT_SKU) && Boolean(featureFlags.isExtractSKU)) {
                redirectPath = '/extract-sku';
              } else if (hasPermission(PERMISSIONS.PARTY_BILLS) && (Boolean(featureFlags.isPartyBills) || Boolean(featureFlags.isVendorBills))) {
                redirectPath = '/party_dashboard';
              } else if (hasPermission(PERMISSIONS.WORKER_BILLS) && (Boolean(featureFlags.isWorkerBills) || Boolean(featureFlags.isWorkerPayments))) {
                redirectPath = '/billing';
              } else if (hasPermission(PERMISSIONS.FINAL_PRODUCT) && (Boolean(featureFlags.isFinalProduct) || Boolean(featureFlags.isInProcessProduct))) {
                redirectPath = '/final-product';
              } else if (hasPermission(PERMISSIONS.PLATTING) && Boolean(featureFlags.isPlatting)) {
                redirectPath = '/platting';
              } else if (hasPermission(PERMISSIONS.PRODUCTION_FLOW) && Boolean(featureFlags.isProductionFlow)) {
                redirectPath = '/production-flow';
              } else if (hasPermission(PERMISSIONS.EXTRACT_SKU) && Boolean(featureFlags.isExtractSKU)) {
                // Fallback to SKU if available
                redirectPath = '/extract-sku';
              }
              
              router.push(redirectPath);
            }, 1000);
        } catch (error) {
          // Fallback to default redirect if user fetch fails
          toast.success('Login successful!');
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error('Invalid username or password.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <SEO title="Sign in" description="Sign in to Smart PDF Sort. Sort order PDFs for Meesho, Snapdeal and Amazon." canonicalPath="/login" />
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Boxes */}
        <div className="absolute top-20 left-10 animate-float">
          <FaBoxes className="text-blue-200 text-6xl opacity-20" />
        </div>
        <div className="absolute top-40 right-20 animate-float-delayed">
          <FaWarehouse className="text-indigo-200 text-8xl opacity-20" />
        </div>
        <div className="absolute bottom-20 left-1/4 animate-float">
          <FaTruck className="text-purple-200 text-7xl opacity-20" />
        </div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 animate-slide-up">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/logo-icon.svg" alt="" className="w-16 h-16 animate-bounce-slow" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              OMS Portal
            </h1>
            <p className="text-gray-600 mt-2">Welcome back! Please login to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaUser className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-300 bg-white/50"
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaLock className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-300 bg-white/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-500 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                <>
                  Login
                  <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 OMS Portal by Tech Shekhada. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
