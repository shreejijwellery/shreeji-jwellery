import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { HTTP } from '../actions/actions_creators';
import Link from 'next/link';
import SEO from '../components/SEO';
import { FaUser, FaLock, FaPhone, FaBuilding, FaMapMarkerAlt, FaArrowRight, FaTruck, FaBoxes, FaWarehouse, FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import { isValidIndianMobile } from '../lib/mobileValidation';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    username: '',
    password: '',
    role: 'manager',
    permissions: [],
    companyName: '',
    address: '',
    referralCode: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameCheckTimeoutRef = useRef(null);
  const router = useRouter();

  // Username format: 3–30 chars, alphanumeric and underscore only
  const usernameFormatRegex = /^[a-zA-Z0-9_]{3,30}$/;
  const validateUsernameFormat = (value) => value.trim().length >= 3 && usernameFormatRegex.test(value.trim());

  // Password: min 8 chars, at least one letter and one number
  const getPasswordError = (value) => {
    if (!value) return '';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-zA-Z]/.test(value)) return 'Password must contain at least one letter';
    if (!/\d/.test(value)) return 'Password must contain at least one number';
    return '';
  };
  const validatePassword = (value) => !getPasswordError(value);

  // Pre-fill referral code from URL (e.g. /signup?referralCode=ABC123)
  useEffect(() => {
    const code = router.query.referralCode;
    if (code && typeof code === 'string') {
      setFormData(prev => ({ ...prev, referralCode: code.trim().toUpperCase() }));
    }
  }, [router.query.referralCode]);

  const checkUsernameAvailable = useCallback(async (username) => {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3) return;
    setUsernameChecking(true);
    setErrors((prev) => ({ ...prev, username: '' }));
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, username: data?.message || 'Could not check username' }));
        return;
      }
      if (!data.available) {
        setErrors((prev) => ({ ...prev, username: 'Username already exists' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, username: 'Could not check username. Try again.' }));
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Mobile: allow only digits, max 12 (so 91 + 10 digits is allowed)
    if (name === 'mobileNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 12);
      setFormData({ ...formData, [name]: digitsOnly });
      if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: '' }));
      if (digitsOnly.length >= 10) {
        if (!isValidIndianMobile(digitsOnly)) {
          setErrors((prev) => ({ ...prev, mobileNumber: 'Invalid mobile number. Use 10 digits starting with 6–9 (e.g. 9876543210).' }));
        }
      }
      return;
    }

    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Username: clear error on type; debounce availability check
    if (name === 'username') {
      if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
      const trimmed = value.trim();
      if (trimmed.length > 0 && trimmed.length < 3) {
        setErrors((prev) => ({ ...prev, username: 'Username must be at least 3 characters' }));
      } else if (trimmed.length >= 3 && !usernameFormatRegex.test(trimmed)) {
        setErrors((prev) => ({ ...prev, username: 'Use only letters, numbers and underscore (3–30 characters)' }));
      } else if (trimmed.length >= 3) {
        usernameCheckTimeoutRef.current = setTimeout(() => checkUsernameAvailable(trimmed), 500);
      }
    }

    // Password: validate as user types
    if (name === 'password') {
      const err = getPasswordError(value);
      setErrors((prev) => ({ ...prev, password: err }));
    }

    // Company name: at least 3 characters
    if (name === 'companyName') {
      const trimmed = value.trim();
      if (trimmed.length > 0 && trimmed.length < 3) {
        setErrors((prev) => ({ ...prev, companyName: 'Company name must be at least 3 characters' }));
      } else if (errors.companyName) {
        setErrors((prev) => ({ ...prev, companyName: '' }));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'mobileNumber') {
      if (value.trim()) {
        if (!isValidIndianMobile(value)) {
          setErrors((prev) => ({ ...prev, mobileNumber: 'Invalid mobile number. Use 10 digits starting with 6–9 (e.g. 9876543210).' }));
        }
      }
    }
    if (name === 'username') {
      const trimmed = value.trim();
      if (trimmed.length > 0 && trimmed.length < 3) {
        setErrors((prev) => ({ ...prev, username: 'Username must be at least 3 characters' }));
      } else if (trimmed.length >= 3 && !usernameFormatRegex.test(trimmed)) {
        setErrors((prev) => ({ ...prev, username: 'Use only letters, numbers and underscore (3–30 characters)' }));
      } else if (trimmed.length >= 3) {
        checkUsernameAvailable(trimmed);
      }
    }
    if (name === 'password') {
      const err = getPasswordError(value);
      setErrors((prev) => ({ ...prev, password: err }));
    }
    if (name === 'companyName') {
      const trimmed = value.trim();
      if (trimmed.length > 0 && trimmed.length < 3) {
        setErrors((prev) => ({ ...prev, companyName: 'Company name must be at least 3 characters' }));
      }
    }
  };

  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
    };
  }, []);

  const validateMobileNumber = (mobileNumber) => isValidIndianMobile(mobileNumber);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!validateMobileNumber(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Invalid mobile number. Use 10 digits starting with 6–9 (e.g. 9876543210).';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!validateUsernameFormat(formData.username)) {
      newErrors.username = formData.username.trim().length < 3
        ? 'Username must be at least 3 characters'
        : 'Use only letters, numbers and underscore (3–30 characters)';
    }
    const passwordErr = getPasswordError(formData.password);
    if (passwordErr) {
      newErrors.password = passwordErr;
    }
    if (formData.companyName.trim().length < 3) {
      newErrors.companyName = 'Company name must be at least 3 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      const response = await HTTP('POST', '/signup', formData);
      toast.success('Account created successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    } catch (error) {
      console.error('Error signing up:', error);
      const message = error?.response?.data?.message || 'Error creating account. Please try again.';
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden py-12">
      <SEO title="Sign up" description="Create a free SellerOS account. PDF crop, label crop for Meesho, Flipkart, Amazon, Snapdeal. 50 free credits for 7 days." canonicalPath="/signup" />
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Icons */}
        <div className="absolute top-20 left-10 animate-float">
          <FaBoxes className="text-purple-200 text-6xl opacity-20" />
        </div>
        <div className="absolute top-40 right-20 animate-float-delayed">
          <FaWarehouse className="text-pink-200 text-8xl opacity-20" />
        </div>
        <div className="absolute bottom-20 left-1/4 animate-float">
          <FaTruck className="text-blue-200 text-7xl opacity-20" />
        </div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 animate-slide-up">
          {/* Logo/Brand - click icon to go to landing */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 animate-bounce-slow no-underline hover:opacity-90 transition-opacity" aria-label="Go to home">
              <FaUserPlus className="text-white text-3xl" />
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-gray-600 mt-2">Join SellerOS today</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaUser className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-300 bg-white/50"
              />
            </div>

            {/* Mobile Number Input - wrapper keeps icon aligned when error message shows */}
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={12}
                  name="mobileNumber"
                  placeholder="Mobile Number (e.g. 9876543210)"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 bg-white/50 ${
                    errors.mobileNumber
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
                  }`}
                />
              </div>
              {errors.mobileNumber && (
                <p className="text-red-500 text-sm mt-1 ml-1">{errors.mobileNumber}</p>
              )}
            </div>

            {/* Username Input - wrapper keeps icon aligned when error/checking message shows */}
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Username (3–30 characters, letters, numbers, underscore)"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 bg-white/50 ${
                    errors.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
                  }`}
                />
              </div>
              {usernameChecking && (
                <p className="text-gray-500 text-sm mt-1 ml-1">Checking availability...</p>
              )}
              {errors.username && !usernameChecking && (
                <p className="text-red-500 text-sm mt-1 ml-1">{errors.username}</p>
              )}
            </div>

            {/* Password Input - wrapper keeps icon aligned when error shows */}
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password (min 8 chars, letter + number)"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 bg-white/50 ${
                    errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-500 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 ml-1">{errors.password}</p>
              )}
            </div>

            {/* Company Name Input - wrapper keeps icon aligned when error shows */}
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaBuilding className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="text"
                  name="companyName"
                  placeholder="Company Name (min 3 characters)"
                  value={formData.companyName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 bg-white/50 ${
                    errors.companyName
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
                  }`}
                />
              </div>
              {errors.companyName && (
                <p className="text-red-500 text-sm mt-1 ml-1">{errors.companyName}</p>
              )}
            </div>

            {/* Address Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaMapMarkerAlt className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input
                type="text"
                name="address"
                placeholder="Address (optional)"
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-300 bg-white/50"
              />
            </div>

            {/* Referral Code (optional) - referrer earns 10% of your first purchase (up to 200 credits) */}
            <div className="relative group">
              <input
                type="text"
                name="referralCode"
                placeholder="Referral code (optional)"
                value={formData.referralCode}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-300 bg-white/50"
              />
              <p className="text-xs text-gray-500 mt-1">Have a referral code? The person who referred you earns 10% of your first purchase as credits (up to 200).</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group mt-6"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Sign Up
                  <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline transition-colors">
                Login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 SellerOS by Tech Shekhada. All rights reserved.
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

export default Signup;
