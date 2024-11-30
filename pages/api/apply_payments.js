import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
import { authMiddleware } from './common/common.services';
// Connect to MongoDB

// Create Work Record
export const applyPayments = async (req, res) => {
    await connectToDatabase();
    const { _id, company } = req.userData;
    const { recordIds, payment_status, } = req.body;
    const payment_date = new Date().toISOString();
    try {
        const updatedRecords = await WorkRecord.updateMany(
            { _id: { $in: recordIds.map(id => new mongoose.Types.ObjectId(id)) , company} },
            { $set : { payment_date, payment_status, addedBy: _id }},
        );
        res.status(200).json(updatedRecords);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



// Export the API functions
const handler = async (req, res) => {
    switch (req.method) {
        case 'POST':
            return applyPayments(req, res);

    }
}

export default authMiddleware(handler);