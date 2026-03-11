import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import Company from '../../models/company';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isUserNameAvailable } from './common/common.services';
import { TRIAL_CREDITS, TRIAL_DAYS, REFERRAL_CREDITS_REFERRER, REFERRAL_CREDITS_REFERRED } from '../../lib/creditConfig';
import CreditTransaction from '../../models/CreditTransaction';
import { addCredits } from '../../lib/creditsService';

function generateReferralCode() {
  return crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toUpperCase();
}

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'POST') {
    const { name, mobileNumber, username, password, role, permissions, companyName, address, referralCode } = req.body;

    if (!name || !mobileNumber || !username || !password || !role || !permissions || !companyName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const isUsernameAvailable = await isUserNameAvailable(username);
      if (!isUsernameAvailable) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      let referrerCompany = null;
      if (referralCode && typeof referralCode === 'string') {
        referrerCompany = await Company.findOne({ referralCode: referralCode.trim().toUpperCase(), isDeleted: { $ne: true } });
      }

      const trialExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      let company;
      if (companyName) {
        let newReferralCode = generateReferralCode();
        while (await Company.findOne({ referralCode: newReferralCode })) {
          newReferralCode = generateReferralCode();
        }
        const newCompany = new Company({
          companyName,
          address,
          creditBalance: 0,
          trialCreditsGranted: TRIAL_CREDITS,
          trialCreditsExpiresAt: trialExpiresAt,
          referralCode: newReferralCode,
          referredByCompanyId: referrerCompany?._id || null,
        });
        company = await newCompany.save();

        await CreditTransaction.create({
          company: company._id,
          amount: TRIAL_CREDITS,
          type: 'trial',
          balanceAfter: TRIAL_CREDITS,
          metadata: { trialDays: TRIAL_DAYS, expiresAt: trialExpiresAt },
        });

        if (referrerCompany) {
          await addCredits(company._id, REFERRAL_CREDITS_REFERRED, 'referral', { referredBy: referrerCompany._id }, null);
          await addCredits(referrerCompany._id, REFERRAL_CREDITS_REFERRER, 'referral_bonus', { referredCompany: company._id }, null);
        }
      }

      const newUser = new User({
        name,
        mobileNumber,
        username,
        password: hashedPassword,
        role,
        permissions,
        company: company._id,
      });
      await newUser.save();

      res.status(201).json({
        message: 'User created successfully',
        trialCredits: TRIAL_CREDITS,
        trialExpiresAt: trialExpiresAt.toISOString(),
        referralCode: company?.referralCode,
        referralCredits: referrerCompany ? REFERRAL_CREDITS_REFERRED : 0,
      });
    } catch (error) {
      res.status(500).json({
        message: process.env.NODE_ENV === 'production' ? 'Registration failed. Please try again.' : `Error creating user: ${String(error?.message)}`,
        ...(process.env.NODE_ENV !== 'production' && { error: String(error?.message) }),
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
