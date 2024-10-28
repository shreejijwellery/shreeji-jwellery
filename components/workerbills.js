import React, { useEffect, useState } from 'react';
import WorkerDropdown from './worker_dropdown';

export default function WorkerBills() {
    const [bills, setBills] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workDetails, setWorkDetails] = useState([]); // New state for work details

    useEffect(() => {
        const fetchBills = async () => {
            try {
                // const response = await fetch(`/api/worker/${selectedWorker}/bills`);
                // const data = await response.json();
                // setBills(data);
            } catch (error) {
                console.error('Error fetching bills:', error);
            }
        };

        const fetchWorkDetails = async () => { // New function to fetch work details
            try {
                // const response = await fetch(`/api/worker/${selectedWorker}/work-details`);
                // const data = await response.json();
                // setWorkDetails(data);
            } catch (error) {
                console.error('Error fetching work details:', error);
            }
        };

        if (selectedWorker) {
            fetchBills();
            fetchWorkDetails(); // Call to fetch work details
        }
    }, [selectedWorker]);

    return (
        <div>
            <WorkerDropdown setSelectedWorker={setSelectedWorker} />
            <div>
                {bills.map(bill => (
                    <div key={bill.id}>
                        <div>{bill.date}</div>
                        <div>{bill.amount}</div>
                    </div>
                ))}
            </div>
            {workDetails.length > 0 && ( // New section for work details
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>Section</div>
                    <div>Item</div>
                    <div>Piece</div>
                    <div>Rate</div>
                    <div>Amount</div>
                </div>
            )}
            {workDetails.map(detail => ( // Displaying work details
                <div key={detail._id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>{detail.section}</div>
                    <div>{detail.item}</div>
                    <div>{detail.piece}</div> {/* New column for Piece */}
                    <div>{detail.rate}</div> {/* New column for Rate */}
                    <div>{detail.piece * detail.rate}</div> {/* New column for Amount */}
                </div>
            ))}
        </div>
    );
}
