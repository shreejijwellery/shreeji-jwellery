import axios from 'axios';
import { toast } from 'react-toastify';
export const fetchAllSections = async (isCallApi) => {
    try {
        if(!isCallApi) {
            const sections = JSON.parse(localStorage.getItem('sections'));
            if(sections) {
                return sections;
            }
        }
        const response = await HTTP('GET', '/sections');
        localStorage.setItem('sections', JSON.stringify(response.sections));
        return response.sections;
        
    } catch (error) {
        console.error('Error fetching sections:', error);
        return [];
    }
};    

export const fetchAllItems = async (isCallApi) => {
    try {
        if(!isCallApi) {
            const items = JSON.parse(localStorage.getItem('items'));
            if(items) {
                return items;
            }
        }
        const response = await HTTP('GET', '/items');
        localStorage.setItem('items', JSON.stringify(response.items));
        return response.items;
    } catch (error) {
        console.error('Error fetching items:', error);
        return [];
    }
}

export const fetchAllWorker = async (isCallApi) => {
    try {
        if(!isCallApi) {
            const workers = JSON.parse(localStorage.getItem('workers'));
            if(workers) {
                return workers;
            }
        }
        const response = await HTTP('GET', '/workers');
        localStorage.setItem('workers', JSON.stringify(response));
        return response;
    } catch (error) {
        console.error('Error fetching workers:', error);
        return [];
    }
}

export const fetchAllParties = async (isCallApi) => {
    try {
        if(!isCallApi) {
            const workers = JSON.parse(localStorage.getItem('parties'));
            if(workers) {
                return workers;
            }
        }
        const response = await HTTP('GET', '/party');
        localStorage.setItem('parties', JSON.stringify(response));
        return response;
    } catch (error) {
        console.error('Error fetching parties:', error);
        return [];
    }
}
export const callAPisOnLogin = async () => {
    await fetchAllSections(true);
    await fetchAllItems(true);
    await fetchAllWorker(true);
    await fetchAllParties(true);
}

export const HTTP = async (method, url, data = null) => {
    const token = localStorage.getItem('token');
    const config = {
        baseURL: '/api',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        method: method,
        url: url,
        ...(data && { data })
    };

    try {
        const response = await axios(config);
        console.log(response);
        if(!response?.data){
            throw response?.message || 'Something went wrong';
        }
        return response?.data;
    } catch (error) {
        toast.error(error?.response?.data?.message || 'Something went wrong');
        console.error('Error fetching data:', error);
        throw error?.response?.data?.message  || 'Something went wrong';
    }
}
