
import React, { useEffect, useState } from 'react';


const WorkerDropdown = () => {
    const [workers, setWorkers] = useState([]);

    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const response = await fetch('/api/workers'); // Adjust the API endpoint as needed
                const data = await response.json();
                setWorkers(data);
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