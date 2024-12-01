// pages/api/workers/[id].js
import connectToDatabase from '../../../lib/mongodb';
import Worker from '../../../models/workers';
import { authMiddleware } from '../common/common.services';

 async function handler(req, res) {
    const { id } = req.query;
    await connectToDatabase();

    if (req.method === 'DELETE') {
        const worker = await Worker.findById(id);
        if (!worker) return res.status(404).json({ message: 'Worker not found' });

        worker.isDeleted = true;
        await worker.save();
        return res.status(204).end();
    }

    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default authMiddleware(handler);