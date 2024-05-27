import '../styles/globals.css';
import Layout from '../components/Layout';
import ToastContainerWrapper from '../components/ToastContainer';
import 'tailwindcss/tailwind.css';
function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <ToastContainerWrapper />
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
