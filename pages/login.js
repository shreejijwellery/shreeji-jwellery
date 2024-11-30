import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { callAPisOnLogin, HTTP } from '../actions/actions_creators';
import Link from 'next/link';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await HTTP('POST','/login', formData);
      if (response?.token) {
        localStorage.setItem('token', response.token);
        router.push('/');
        callAPisOnLogin()
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        <form onSubmit={handleSubmit}>
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
          
          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full">
            Login
          </button>
          <div className="text-center mt-4"> 
            <Link href="/signup">Signup</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
