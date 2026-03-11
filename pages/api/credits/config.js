import connectToDatabase from '../../../lib/mongodb';
import { getCreditSettings } from '../../../lib/creditsService';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    await connectToDatabase();
    const settings = await getCreditSettings();
    return res.status(200).json(settings);
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load credit config', error: String(e?.message) });
  }
}

export default handler;
