import axios from 'axios';
import { toast } from 'react-toastify';

export const fetchAllSections = async () => {
    const response = await HTTP('GET', '/sections');
    return response?.sections ?? [];
}

export const fetchAllSubSections = async () => {
    const response = await HTTP('GET', '/sub-section');
    return response?.subSections ?? [];
}   

export const callAPisOnLogin = async () => {
    fetchAllSections();
    fetchAllSubSections();
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
