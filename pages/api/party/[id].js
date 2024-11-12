// pages/api/workers/[id].js
import connectToDatabase from '../../../lib/mongodb';
import Party from '../../../models/party';

export default async function handler(req, res) {
    const { id } = req.query;
    await connectToDatabase();

    if (req.method === 'DELETE') {
        const party = await Party.findById(id);
        if (!party) return res.status(404).json({ message: 'Party not found' });

        party.isDeleted = true;
        await party.save();
        return res.status(204).end();
    }

    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

