import axios from 'axios';
export const fetchAllSections = async (isCallApi) => {
    try {
        if(!isCallApi) {
            const sections = JSON.parse(localStorage.getItem('sections'));
            if(sections) {
                return sections;
            }
        }
        const response = await axios.get('/api/sections');
        localStorage.setItem('sections', JSON.stringify(response.data.sections));
        return response.data.sections;
        
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
        const response = await axios.get('/api/items');
        localStorage.setItem('items', JSON.stringify(response.data.items));
        return response.data.items;
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
        const response = await axios.get('/api/workers');
        localStorage.setItem('workers', JSON.stringify(response.data));
        return response.data;
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
        const response = await axios.get('/api/party');
        localStorage.setItem('parties', JSON.stringify(response.data));
        return response.data;
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