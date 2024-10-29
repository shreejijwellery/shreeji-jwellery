import '../styles/globals.css';
import Layout from '../components/Layout';
import ToastContainerWrapper from '../components/ToastContainer';
import 'tailwindcss/tailwind.css';
import { useEffect } from 'react';
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const clearLocalStorage = () => {
      localStorage.removeItem('items');
      localStorage.removeItem('workers');
      localStorage.removeItem('sections');
    };

    window.addEventListener('beforeunload', clearLocalStorage);

    return () => {
      window.removeEventListener('beforeunload', clearLocalStorage);
    };
  }, []);
  return (
    <Layout>
      <ToastContainerWrapper />
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
