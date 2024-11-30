// pages/UpdateUser.js

import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { HTTP } from '../actions/actions_creators';

function UpdateUser() {
  const [showPassword, setShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [user, setUser] = useState({
    name: '',
    mobileNumber: '',
    username: '',
    password: '',
    oldPassword: '',
  });
  const [initialUser, setInitialUser] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setUser({
      ...user,
      [name]: value,
    });
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    setInitialUser(userData);
  }, []);

  const isUserChanged = () => {
    return JSON.stringify(user) !== JSON.stringify(initialUser);
  };

  const handleSubmit = async e => {
    try {
      e.preventDefault();
      // Handle form submission logic here
      console.log('User updated:', user);
      let updateData = {
        ...user,
        _id: user._id,
      };
      const updatedUser = await HTTP('PUT', `/user`, updateData);
      localStorage.setItem('user', JSON.stringify(updatedUser.data.data));
      toast.success('Profile updated successfully');
      setShowPassword(false);
      setShowOldPassword(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error);
      setShowPassword(false);
      setShowOldPassword(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-md ">
      <h1 className="text-2xl font-bold mb-4 text-center">Update Profile</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Name:</label>
          <input
            type="text"
            name="name"
            value={user.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Mobile Number:</label>
          <input
            type="text"
            name="mobileNumber"
            value={user.mobileNumber}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Username:</label>
          <input
            type="text"
            name="username"
            value={user.username}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Old Password:</label>
          <div className="relative flex items-center border rounded-md">
            <input
              type={showOldPassword ? 'text' : 'password'}
              name="oldPassword"
              value={user.oldPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
            <div
              className="absolute right-2 cursor-pointer"
              onClick={() => setShowOldPassword(!showOldPassword)}>
              {showOldPassword ? <FaEye /> : <FaEyeSlash />}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">New Password:</label>
          <div className="relative flex items-center border rounded-md">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={user.password}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
            <div
              className="absolute right-2 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </div>
          </div>
          <p className="text-gray-500 text-sm">Leave blank to keep the same password</p>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
          disabled={!isUserChanged()}
        >
          Update
        </button>
      </form>
    </div>
  );
}

export default UpdateUser;
