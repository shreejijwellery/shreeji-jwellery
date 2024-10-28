import React, { useEffect, useState } from 'react';
import WorkerBills from '../components/workerbills';


const SettingsTabs = () => {
    const [selectedTab, setSelectedTab] = useState('billing');
    const [user, setUser] = useState(null);
    useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    }, []);
    return (
        <div className="p-4">
            <div className="flex space-x-4">
                <button onClick={() => setSelectedTab('billing')} className={`px-4 py-2 rounded ${selectedTab === 'billing' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                    Billing
                </button>
           
            </div>
            <div className="mt-4">
                {selectedTab === 'billing' && <WorkerBills user={user}/>}
            </div>
        </div>
    );
};

export default SettingsTabs;
