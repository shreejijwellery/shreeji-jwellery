import { authMiddleware } from '../common/common.services';
import { getEffectiveBalance, deductCredits, getCreditsRequiredForPdfPages } from '../../../lib/creditsService';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const company = req.companyData;
  const user = req.userData;
  if (!company || !user) {
    return res.status(404).json({ message: 'Company not found' });
  }
  const { pages } = req.body || {};
  const pageCount = typeof pages === 'number' && pages > 0 ? Number(pages) : 0;
  if (pageCount <= 0) {
    return res.status(400).json({ message: 'Invalid pages count', required: 1 });
  }
  const amount = await getCreditsRequiredForPdfPages(pageCount);
  const effective = getEffectiveBalance(company);
  if (effective < amount) {
    return res.status(402).json({
      message: 'Insufficient credits. Purchase credits to continue.',
      required: amount,
      balance: effective,
      pages: pageCount,
    });
  }
  try {
    const result = await deductCredits(company._id, amount, 'consumption', { pages: pageCount, source: 'client_deduct' }, user._id);
    if (!result.ok) {
      return res.status(402).json({ message: 'Insufficient credits. Purchase credits to continue.', required: amount, balance: result.balance });
    }
    return res.status(200).json({ balanceAfter: result.balanceAfter });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to deduct credits', error: String(e?.message) });
  }
}

export default authMiddleware(handler);
