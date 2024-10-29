
import React, { useEffect, useState } from 'react';
import { fetchAllWorker } from '../actions/actions_creators';


const WorkerDropdown = () => {
    const [workers, setWorkers] = useState([]);

    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const response = await fetchAllWorker(); 
                setWorkers(response);
            } catch (error) {
                console.error('Error fetching workers:', error);
            }
        };

        fetchWorkers();
    }, []);

    return (
        <select>
            {workers.map(worker => (
                <option key={worker.id} value={worker.id}>
                    {worker.name}
                </option>
            ))}
        </select>
    );
};


export default WorkerDropdown;