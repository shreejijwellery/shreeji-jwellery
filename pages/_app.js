import '../styles/globals.css';
import Head from 'next/head';
import Layout from '../components/Layout';
import ToastContainerWrapper from '../components/ToastContainer';
import 'tailwindcss/tailwind.css';
import { useEffect } from 'react';

const DEFAULT_TITLE = 'Smart PDF Sort – Meesho, Snapdeal & Amazon order sorting';
const DEFAULT_DESCRIPTION = 'Sort order PDFs for Meesho, Snapdeal and Amazon in seconds. Credit-based, secure, built for Indian sellers. Start with free credits.';

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
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <title>{DEFAULT_TITLE}</title>
      </Head>
      <Layout>
      <ToastContainerWrapper />
      <Component {...pageProps} />
    </Layout>
    </>
  );
}

export default MyApp;
