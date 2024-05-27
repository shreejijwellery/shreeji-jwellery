import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';
import 'tailwindcss/tailwind.css';

const CustomTileContent = ({ date, skuData }) => {
  const dateString = date.toISOString().split('T')[0];
  const skuCount = skuData[dateString] || 0;

  return (
    <div
      className={`flex items-center justify-center h-full ${
        skuCount === 0 ? 'bg-red-500' : 'bg-green-500'
      }`}
    >
      {skuCount}
    </div>
  );
};

const CalendarPage = () => {
  const [skuData, setSkuData] = useState({});
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    // Fetch SKU counts data
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

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">SKU Calendar</h1>
      <Calendar
        value={date}
        onChange={setDate}
        tileContent={({ date, view }) => {
          console.log(date);
          // console.log(skuData);
        //   const data = skuData?.find((item) => item.date === date.toISOString().split('T')[0]);  
        //   console.log(data);
          if(view === 'month') 
          return (
            <CustomTileContent date={date} skuData={skuData} />
          )}
        }
      />
    </div>
  );
};

export default CalendarPage;
