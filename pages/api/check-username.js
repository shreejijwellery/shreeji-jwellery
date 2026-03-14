import connectToDatabase from '../../lib/mongodb';
import { isUserNameAvailable } from './common/common.services';

/**
 * GET /api/check-username?username=xxx
 * Returns { available: boolean } for use during signup (no auth required).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const username = typeof req.query.username === 'string' ? req.query.username.trim() : '';
  if (!username) {
    return res.status(400).json({ available: false, message: 'Username is required' });
  }

  await connectToDatabase();
  const available = await isUserNameAvailable(username);
  return res.json({ available });
}
