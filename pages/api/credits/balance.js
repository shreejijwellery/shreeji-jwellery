import { authMiddleware } from '../common/common.services';
import { getEffectiveBalance, isTrialActive, roundCredits } from '../../../lib/creditsService';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const company = req.companyData;
  if (!company) {
    return res.status(404).json({ message: 'Company not found' });
  }
  const balance = getEffectiveBalance(company);
  const trialActive = isTrialActive(company);
  const trialExpiresAt = company.trialCreditsExpiresAt || null;
  return res.status(200).json({
    balance,
    creditBalance: roundCredits(company.creditBalance ?? 0),
    trialCreditsGranted: roundCredits(company.trialCreditsGranted ?? 0),
    trialActive,
    trialExpiresAt,
  });
}

export default authMiddleware(handler);
