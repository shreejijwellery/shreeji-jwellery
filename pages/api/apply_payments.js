import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
// Connect to MongoDB

// Create Work Record
export const applyPayments = async (req, res) => {
    await connectToDatabase();
    const { recordIds, payment_status, } = req.body;
    const payment_date = new Date().toISOString();
    try {
        const updatedRecords = await WorkRecord.updateMany(
            { _id: { $in: recordIds.map(id => new mongoose.Types.ObjectId(id)) } },
            { $set : { payment_date, payment_status }},
        );
        res.status(200).json(updatedRecords);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



// Export the API functions
export default async function handler(req, res) {
    switch (req.method) {
        case 'POST':
            return applyPayments(req, res);

    }
}

