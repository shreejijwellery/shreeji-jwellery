import mongoose from 'mongoose';
import { WorkRecord } from '../../models/work_records'; // Adjust the import path as necessary
import connectToDatabase from '../../lib/mongodb';
// Connect to MongoDB

// Create Work Record
export const createWorkRecord = async (req, res) => {
    await connectToDatabase();
    const { section, item, worker, piece, item_rate, amount, worker_name, section_name, item_name } = req.body;

    try {
        const newRecord = new WorkRecord({
            section,
            item,
            worker,
            piece,
            item_rate,
            amount,
            worker_name,
            section_name,
            item_name,
        });
        await newRecord.save();
        res.status(201).json(newRecord);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get Work Records
export const getWorkRecords = async (req, res) => {
    await connectToDatabase();
    try {
        const { worker } = req.query;
        let query = { isDeleted: false };
        if (worker) query = { ...query, worker };
        const records = await WorkRecord.find(query);
        res.status(200).json(records);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update Work Record
export const updateWorkRecord = async (req, res) => {
    await connectToDatabase();
    const { id } = req.query; // Assuming the ID is passed as a query parameter

    try {
        const updatedRecord = await WorkRecord.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedRecord) return res.status(404).json({ error: 'Record not found' });
        res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Soft Delete Work Record
export const softDeleteWorkRecord = async (req, res) => {
    await connectToDatabase();
    const { id } = req.query; // Assuming the ID is passed as a query parameter

    try {
        const deletedRecord = await WorkRecord.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!deletedRecord) return res.status(404).json({ error: 'Record not found' });
        res.status(200).json(deletedRecord);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Export the API functions
export default async function handler(req, res) {
    switch (req.method) {
        case 'POST':
            return createWorkRecord(req, res);
        case 'GET':
            return getWorkRecords(req, res);
        case 'PUT':
            return updateWorkRecord(req, res);
        case 'DELETE':
            return softDeleteWorkRecord(req, res);
        default:
            res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

