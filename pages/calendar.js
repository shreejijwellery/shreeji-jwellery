import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';
import 'tailwindcss/tailwind.css';
import moment from 'moment-timezone';
import { toast } from 'react-toastify';
import OrderData from '../components/OrderData';
import { useRouter } from 'next/router';

const CustomTileContent = ({ date, skuData }) => {
  const skuCount = skuData?.quantity || 0;
  const today = new Date();

  return (
    today >= date && (
      <div
        className={`flex items-center justify-center h-full w-full rounded-full ${
          skuCount === 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}
      >
        {skuCount}
      </div>
    )
  );
};

const CalendarPage = () => {
  const [user, setUser] = useState(null);
  const [skuData, setSkuData] = useState([]);
  const [date, setDate] = useState(new Date());
  const [orderData, setorderData] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      axios
        .get('/api/validateToken', { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          setUser(response.data.user);
          fetchGetOrderFiles();
        })
        .catch(() => {
          router.push('/login');
        });
    }
  }, [router]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/skuCounts');
        setSkuData(response.data?.data);
      } catch (error) {
        console.error('Error fetching SKU data:', error);
      }
    };

    fetchData();
  }, []);

  const fetchGetOrderFiles = async () => {
    try {
      const response = await axios.get('/api/getOrderFiles', {
        params: {
          date: moment(date).tz("IST").toISOString()
        }
      });
      if (response.status === 200) {
        const result = response?.data?.data?.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          price: item.price || 'Price not found',
          finalPrice: (item.quantity || 0) + (item.price || 0),
          uploadedBy: item?.uploadedBy?.name,
          uploadId: item.uploadId
        }));
        setorderData(result);
      }
    } catch (error) {
      console.error('Error fetching order files:', error);
      toast.error('Error fetching order files. Please try again.');
    }
  };
  // useEffect(() => {
  //   console.log('Date changed:', date)
  //   fetchGetOrderFiles()
  // }, [date])
  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-center">SKU Calendar</h1>
      <div className="bg-white shadow-lg rounded-lg p-4">
        <Calendar
          value={date}
          onChange={setDate}
          tileContent={({ date, view }) => {
            const dateString = moment(date).startOf('day').toISOString().split('T')[0];
            const data = skuData?.find((item) => moment(item.date).startOf('day').toISOString().split('T')[0] === dateString);
            if (view === 'month') {
              return <CustomTileContent date={date} skuData={data} />;
            }
          }}
          tileClassName={({ date, view }) => {
            if (view === 'month') {
              const dateString = moment(date).startOf('day').toISOString().split('T')[0];
              const data = skuData?.find((item) => moment(item.date).startOf('day').toISOString().split('T')[0] === dateString);
              if (data?.quantity === 0) {
                return 'border border-red-500';
              }
              if (data?.quantity > 0) {
                return 'border border-green-500';
              }
            }
            return '';
          }}
          className="mx-auto"
        />
      </div>
      <OrderData orderData={orderData} user={user} fetchGetOrderFiles={fetchGetOrderFiles} />
    </div>
    
  );
};

export default CalendarPage;
