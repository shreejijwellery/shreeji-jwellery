import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import Company from '../../models/company';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isUserNameAvailable } from './common/common.services';
import { TRIAL_CREDITS, TRIAL_DAYS } from '../../lib/creditConfig';
import CreditTransaction from '../../models/CreditTransaction';
import { notifySignup } from '../../lib/notifyAlerts';
import { normalizeIndianMobile, isValidIndianMobile } from '../../lib/mobileValidation';

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
      const normalizedMobile = normalizeIndianMobile(mobileNumber);
      if (!normalizedMobile) {
        return res.status(400).json({ message: 'Invalid mobile number. Use a valid 10-digit Indian number (e.g. 9876543210).' });
      }
      const existingByMobile = await User.findOne({ mobileNumber: normalizedMobile, isDeleted: { $ne: true } });
      if (existingByMobile) {
        return res.status(400).json({ message: 'This mobile number is already registered. Use a different number or sign in.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const isUsernameAvailable = await isUserNameAvailable(username);
      if (!isUsernameAvailable) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      let referrerCompany = null;
      const codeTrimmed = referralCode && typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : '';
      if (codeTrimmed) {
        referrerCompany = await Company.findOne({ referralCode: codeTrimmed, isDeleted: { $ne: true }, isBlocked: { $ne: true } });
        if (!referrerCompany) {
          return res.status(400).json({ message: 'Invalid referral code. Please check and try again or leave it blank.' });
        }
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

        // Referral credits are granted when the referred user makes their first purchase (see Razorpay webhook).
      }

      const newUser = new User({
        name,
        mobileNumber: normalizedMobile,
        username,
        password: hashedPassword,
        role,
        permissions,
        company: company._id,
      });
      await newUser.save();

      notifySignup({
        companyName: company?.companyName,
        userName: name,
        username,
        mobileNumber: normalizedMobile,
        address: company?.address || address,
        referralCode: codeTrimmed || undefined,
      }).catch((err) => console.error('[signup] alert error:', err?.message));

      res.status(201).json({
        message: 'User created successfully',
        trialCredits: TRIAL_CREDITS,
        trialExpiresAt: trialExpiresAt.toISOString(),
        referralCode: company?.referralCode,
        referredByCode: !!referrerCompany, // Referral credits granted on first purchase
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.mobileNumber) {
        return res.status(400).json({ message: 'This mobile number is already registered. Use a different number or sign in.' });
      }
      return res.status(500).json({
        message: process.env.NODE_ENV === 'production' ? 'Registration failed. Please try again.' : `Error creating user: ${String(error?.message)}`,
        ...(process.env.NODE_ENV !== 'production' && { error: String(error?.message) }),
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
