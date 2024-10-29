import React, { useEffect, useState } from 'react';
import WorkerDropdown from './worker_dropdown';
import { fetchAllItems, fetchAllSections } from '../actions/actions_creators';

export default function WorkerBills() {
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workDetails, setWorkDetails] = useState([]); // New state for work details
    const [sections, setSections] = useState([]); // New state for sections
    const [items, setItems] = useState([]); // New state for
    const [filteredItems, setFilteredItems] = useState([]); // New state for filtered items
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const response = await fetchAllSections()
                setSections(response);
            } catch (error) {
                console.error('Error fetching sections:', error);
            }
        };

        fetchSections();

        const fetchItems = async () => {
            try {
                const response = fetchAllItems();
                setItems(response);
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        }
        fetchItems();
    }, []);
    useEffect(() => {

        const fetchWorkDetails = async () => { // New function to fetch work details
            try {
                const response = await fetch(`/api/worker/${selectedWorker}/work-details`);
                const data = await response.json();
                setWorkDetails(data);
            } catch (error) {
                console.error('Error fetching work details:', error);
            }
        };

        if (selectedWorker) {
            fetchWorkDetails(); // Call to fetch work details
        }
    }, [selectedWorker]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const section = formData.get('section');
        const section_name = sections.find(s => s._id === section).name;
        const item = formData.get('item');
        const item_name = items.find(i => i._id === item).name;
        const piece = formData.get('piece');
        const rate = formData.get('rate');
        const worker_name = selectedWorker.name;
        try {
            const response = await fetch('/api/work-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ section, item, piece, rate,  worker: selectedWorker._id, worker_name, section_name, item_name })
            });
            const data = await response.json();
            if (data.message) {
                console.log(data.message);
                setWorkDetails([...workDetails, data.workDetail]);
            }
        } catch (error) {
            console.error('Error adding work detail:', error);
        }
    }
    return (
        <div>
            <WorkerDropdown setSelectedWorker={setSelectedWorker} />
            {sections.length > 0 && items.length > 0 && (
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <select name="section" required>
                            <option value="">Select Section</option>
                            {sections.map(section => (
                                <option key={section._id} value={section._id} onChange={sec => {
                                    
                                    setFilteredItems(items.filter(item => item.section === sec._id))}}>{section.name}</option>
                            ))}
                        </select>
                        <select name="item" required>
                            <option value="">Select Item</option>
                            {filteredItems.map(filteredItem => (
                                <option key={filteredItem._id} value={filteredItem._id}>{filteredItem.name}</option>
                            ))}
                        </select>
                        <select name="item" required>
                            <option value="">Select Item</option>
                            {items.map(item => (
                                <option key={item._id} value={item._id}>{item.name}</option>
                            ))}
                        </select>
                        <input type="number" name="piece" placeholder="Piece" required />
                        <input type="number" name="rate" placeholder="Rate" required />
                        <button type="submit">Add Work Detail</button>
                    </div>
                </form>
            )}
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
