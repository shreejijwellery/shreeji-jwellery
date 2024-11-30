// pages/api/party/index.js
import connectToDatabase from '../../../lib/mongodb';
import Vendor from '../../../models/party';
import { authMiddleware } from '../common/common.services';

const handler = async (req, res) => {
    await connectToDatabase();

    if (req.method === 'GET') {
        const parties = await Vendor.find({ isDeleted: false });
        return res.status(200).json(parties);
    }

    if (req.method === 'POST') {
        const { name, addedBy } = req.body;
        const party = new Vendor({ name, addedBy });
        await party.save();
        return res.status(201).json(party);
    }

    if (req.method === 'PUT') {
        const { _id, name, addedBy } = req.body;
        const updatedWorker = await Vendor.findByIdAndUpdate(_id, { name, addedBy }, { new: true });
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        return res.status(200).json(updatedWorker);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default authMiddleware(handler);