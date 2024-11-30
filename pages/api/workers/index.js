// pages/api/workers/index.js
import connectToDatabase from '../../../lib/mongodb';
import Worker from '../../../models/workers';

export default async function handler(req, res) {
    await connectToDatabase();

    if (req.method === 'GET') {
        const workers = await Worker.find({ isDeleted: false });
        return res.status(200).json(workers);
    }

    if (req.method === 'POST') {
        const { name, lastname, mobile_no, address, addedBy } = req.body;
        const worker = new Worker({ name, lastname, mobile_no, address, addedBy });
        await worker.save();
        return res.status(201).json(worker);
    }

    if (req.method === 'PUT') {
        const { _id, name, lastname, mobile_no, address, addedBy } = req.body;
        const updatedWorker = await Worker.findByIdAndUpdate(_id, { name, lastname, mobile_no, address, addedBy }, { new: true });
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        return res.status(200).json(updatedWorker);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}