// pages/api/party/index.js
import connectToDatabase from '../../../lib/mongodb';
import Party from '../../../models/party';

export default async function handler(req, res) {
    await connectToDatabase();

    if (req.method === 'GET') {
        const parties = await Party.find({ isDeleted: false });
        return res.status(200).json(parties);
    }

    if (req.method === 'POST') {
        const { name, created_by } = req.body;
        const party = new Party({ name, created_by });
        await party.save();
        return res.status(201).json(party);
    }

    if (req.method === 'PUT') {
        const { _id, name, created_by } = req.body;
        const updatedWorker = await Party.findByIdAndUpdate(_id, { name, created_by }, { new: true });
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Party not found' });
        }
        return res.status(200).json(updatedWorker);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}