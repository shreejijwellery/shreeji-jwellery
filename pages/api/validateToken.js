import jwt from 'jsonwebtoken';
import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import Company from '../../models/company';
import { getEffectiveBalance, isTrialActive } from '../../lib/creditsService';
import { USER_ROLES } from '../../lib/constants';

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'GET') {
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'Service temporarily unavailable' });
    }
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Account is blocked. Contact support.', code: 'USER_BLOCKED' });
      }

      let company = user.company ? await Company.findById(user.company).lean() : null;

      // Administrator without a company: allow login with zero credits (admin uses /api/admin/* which don't need company)
      if (!company && user.role === USER_ROLES.ADMINISTRATOR) {
        delete user.password;
        return res.status(200).json({
          user: {
            ...user,
            creditBalance: 0,
            trialActive: false,
            trialExpiresAt: null,
            referralCode: null,
          },
        });
      }

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      if (company.isBlocked) {
        return res.status(403).json({ message: 'Account is blocked. Contact support.', code: 'COMPANY_BLOCKED' });
      }
      delete user.password;
      const creditBalance = getEffectiveBalance(company);
      const trialActive = isTrialActive(company);
      res.status(200).json({
        user: {
          ...user,
          creditBalance,
          trialActive,
          trialExpiresAt: company.trialCreditsExpiresAt || null,
          referralCode: company.referralCode || null,
        },
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
