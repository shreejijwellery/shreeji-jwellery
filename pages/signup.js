import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { HTTP } from '../actions/actions_creators';
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
  });
  const [errors, setErrors] = useState({});
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateMobileNumber = (mobileNumber) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(mobileNumber);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!validateMobileNumber(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Invalid mobile number. It should be 10 digits starting with 6-9.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    try {
      const response = await HTTP('POST', '/signup', formData);
        toast.success('Account created successfully!');
        router.push('/login');
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error('Error creating account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Signup</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mb-4 p-2 w-full border rounded"
          />
          <input
            type="text"
            name="mobileNumber"
            placeholder="Mobile Number"
            value={formData.mobileNumber}
            onChange={handleChange}
            required
            className={`mb-4 p-2 w-full border rounded ${errors.mobileNumber ? 'border-red-500' : ''}`}
          />
          {errors.mobileNumber && <p className="text-red-500 mb-4">{errors.mobileNumber}</p>}
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
            className="mb-4 p-2 w-full border rounded"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="mb-4 p-2 w-full border rounded"
          />
          <input
            type="text"
            name="companyName"
            placeholder="Company Name"
            value={formData.companyName}
            onChange={handleChange}
            required
            className="mb-4 p-2 w-full border rounded"
          />
          <input
            type="text"
            name="address"
            placeholder="Address (optional)"
            value={formData.address}
            onChange={handleChange}
            className="mb-4 p-2 w-full border rounded"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
