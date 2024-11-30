// pages/api/workers/index.js
import connectToDatabase from '../../../lib/mongodb';
import Worker from '../../../models/workers';
import { authMiddleware } from '../common/common.services';

async function handler(req, res) {
    await connectToDatabase();

    if (req.method === 'GET') {
        const company = req.userData?.company;
        const workers = await Worker.find({ isDeleted: false, company });
        return res.status(200).json(workers);
    }

    if (req.method === 'POST') {
        const {_id, company} = req.userData;
        const { name, lastname, mobile_no, address } = req.body;
        const worker = new Worker({ name, lastname, mobile_no, address, lastModifiedBy: _id, company });
        await worker.save();
        return res.status(201).json(worker);
    }

    if (req.method === 'PUT') {
        const userId = req.userData;
        const { _id, name, lastname, mobile_no, address, } = req.body;
        const updatedWorker = await Worker.findByIdAndUpdate(_id, { name, lastname, mobile_no, address, lastModifiedBy: userId }, { new: true });
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        return res.status(200).json(updatedWorker);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default authMiddleware(handler);