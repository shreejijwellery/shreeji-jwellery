// pages/UpdateUser.js

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Formik, Form, Field, FieldArray } from 'formik';
import Modal from 'react-modal';
import { FaEdit, FaTrash, FaPlus, FaSpinner } from 'react-icons/fa'; // Importing React Icons
import { PERMISSIONS, USER_ROLES } from '../lib/constants';
import { HTTP } from '../actions/actions_creators';

// Component for checkbox with indeterminate state support
const SectionCheckbox = ({ checked, indeterminate, onChange }) => {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
  );
};

// Group permissions by sections
const PERMISSION_SECTIONS = [
  {
    title: 'Billing & Payments',
    permissions: [PERMISSIONS.PARTY_BILLS, PERMISSIONS.WORKER_BILLS]
  },
  {
    title: 'Master Data Management',
    permissions: [PERMISSIONS.SECTIONS, PERMISSIONS.ITEMS, PERMISSIONS.VENDORS, PERMISSIONS.WORKERS]
  },
  {
    title: 'Production Management',
    permissions: [PERMISSIONS.FINAL_PRODUCT, PERMISSIONS.IN_PROCESS_PRODUCT, PERMISSIONS.PLATTING, PERMISSIONS.PRODUCTION_FLOW]
  },
  {
    title: 'SKU Management',
    permissions: [PERMISSIONS.EXTRACT_SKU]
  }
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state
  const roles = Object.values(USER_ROLES)?.filter(role => ![USER_ROLES.ADMIN, USER_ROLES.ADMINISTRATOR].includes(role)); // Example roles

  const fetchUsers = async () => {
    setLoading(true); // Start loading
    try {
      const response = await HTTP('GET', '/user');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false); // End loading
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (values, { resetForm }) => {
    setLoading(true); // Start loading
    try {
      if (editingUser) {
        await HTTP('PUT', '/user', { ...values, _id: editingUser._id });
        toast.success('User updated successfully');
      } else {
        await HTTP('POST', '/user', values);
        toast.success('User created successfully');
      }
      resetForm();
      setEditingUser(null);
      setModalIsOpen(false);
      fetchUsers();
    } catch (error) {
        console.log(error);
    } finally {
      setLoading(false); // End loading
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalIsOpen(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await HTTP('DELETE', '/user', { _id: userId });
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error(error.response.data.message);
      }
    }
  };

  const openModal = () => {
    setEditingUser(null);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setEditingUser(null);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold mb-4 text-center">User Management</h1>
      <button onClick={openModal} className="flex items-center bg-green-500 text-white p-2 rounded mb-4">
        <FaPlus className="mr-2" /> Add User
      </button>

      {loading && <FaSpinner className="animate-spin mx-auto mb-4" />} {/* Loading spinner */}

      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr>
            <th className="border border-gray-200 p-2">Username</th>
            <th className="border border-gray-200 p-2">Role</th>
            <th className="border border-gray-200 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td className="border border-gray-200 p-2">{user.username}</td>
              <td className="border border-gray-200 p-2">{user.role}</td>
              <td className="border border-gray-200 p-2 flex justify-start">
                <button onClick={() => handleEdit(user)} className="text-blue-500  p-2 flex items-center hover:text-blue-700 hover:bg-blue-100 transition duration-200">
                  <FaEdit className="mr-1" />
                </button>
                <button onClick={() => handleDelete(user._id)} className="text-red-500 p-2 flex items-center hover:text-red-700 hover:bg-red-100 transition duration-200">
                  <FaTrash className="mr-1" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} ariaHideApp={false} className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{editingUser ? 'Edit User' : 'Add User'}</h2>
        <Formik
          initialValues={{
            name: editingUser ? editingUser.name : '',
            mobileNumber: editingUser ? editingUser.mobileNumber : '',
            username: editingUser ? editingUser.username : '',
            password: '',
            role: USER_ROLES.MANAGER,
            permissions: editingUser ? editingUser.permissions : [],
          }}
          validate={values => {
            const errors = {};
            if (!values.name) {
              errors.name = 'Required';
            }
            if (!values.mobileNumber) {
              errors.mobileNumber = 'Required';
            }
            if (!values.username) {
              errors.username = 'Required';
            }
            return errors;
          }}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, errors }) => (
            <Form>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                <Field name="name" className="border border-gray-300 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Mobile Number</label>
                <Field name="mobileNumber" className="border border-gray-300 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Username</label>
                <Field name="username" className="border border-gray-300 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              { !editingUser && ( // Only show password field when creating a user
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                  <Field type="password" name="password" className="border border-gray-300 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              {/* <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Role</label>
                <Field as="select" name="role" className="border border-gray-300 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </Field>
              </div> */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-3 text-gray-700">Permissions</label>
                <FieldArray name="permissions">
                  {({ push, remove }) => (
                    <div className="space-y-4">
                      {PERMISSION_SECTIONS.map((section, sectionIdx) => {
                        const sectionPermissions = section.permissions;
                        const selectedPermissions = values.permissions || [];
                        const allSectionSelected = sectionPermissions.every(perm => selectedPermissions.includes(perm));
                        const someSectionSelected = sectionPermissions.some(perm => selectedPermissions.includes(perm));

                        const handleSectionToggle = (checked) => {
                          const currentPermissions = [...selectedPermissions];
                          
                          if (checked) {
                            // Add all section permissions
                            sectionPermissions.forEach(perm => {
                              if (!currentPermissions.includes(perm)) {
                                currentPermissions.push(perm);
                              }
                            });
                          } else {
                            // Remove all section permissions
                            sectionPermissions.forEach(perm => {
                              const index = currentPermissions.indexOf(perm);
                              if (index > -1) {
                                currentPermissions.splice(index, 1);
                              }
                            });
                          }
                          
                          setFieldValue('permissions', currentPermissions);
                        };

                        return (
                          <div key={sectionIdx} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center mb-3 pb-2 border-b border-gray-200">
                              <SectionCheckbox
                                checked={allSectionSelected}
                                indeterminate={someSectionSelected && !allSectionSelected}
                                onChange={(e) => handleSectionToggle(e.target.checked)}
                              />
                              <label className="text-base font-semibold text-gray-800 cursor-pointer ml-2" onClick={() => handleSectionToggle(!allSectionSelected)}>
                                {section.title}
                              </label>
                            </div>
                            <div className="grid grid-cols-2 gap-3 ml-6">
                              {sectionPermissions.map((permission) => {
                                const isChecked = selectedPermissions.includes(permission);
                                return (
                                  <div key={permission} className="flex items-center text-sm">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const currentPerms = [...selectedPermissions];
                                        if (e.target.checked) {
                                          if (!currentPerms.includes(permission)) {
                                            currentPerms.push(permission);
                                          }
                                        } else {
                                          const index = currentPerms.indexOf(permission);
                                          if (index > -1) {
                                            currentPerms.splice(index, 1);
                                          }
                                        }
                                        setFieldValue('permissions', currentPerms);
                                      }}
                                      className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label className="text-gray-700 cursor-pointer" onClick={() => {
                                      const currentPerms = [...selectedPermissions];
                                      const index = currentPerms.indexOf(permission);
                                      if (index > -1) {
                                        currentPerms.splice(index, 1);
                                      } else {
                                        currentPerms.push(permission);
                                      }
                                      setFieldValue('permissions', currentPerms);
                                    }}>
                                      {permission.replace(/_/g, ' ')}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </FieldArray>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-200" disabled={loading}>
                  {loading ? <FaSpinner className="animate-spin" /> : (editingUser ? 'Update User' : 'Create User')}
                </button>
                <button type="button" onClick={closeModal} className="bg-gray-400 text-white p-3 rounded-lg hover:bg-gray-500 transition duration-200">
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>
    </div>
  );
};

export default UserManagement;
