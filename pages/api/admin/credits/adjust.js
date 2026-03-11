import Company from '../../../../models/company';
import { adminAuthMiddleware } from '../../common/common.services';
import { addCredits, deductCredits, getEffectiveBalance } from '../../../../lib/creditsService';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { companyId, amount, reason } = req.body || {};
  const company = await Company.findById(companyId).lean();
  if (!company) {
    return res.status(404).json({ message: 'Company not found' });
  }
  const numAmount = Number(amount);
  if (!Number.isInteger(numAmount) || numAmount === 0) {
    return res.status(400).json({ message: 'Invalid amount; use a non-zero integer' });
  }
  try {
    if (numAmount > 0) {
      await addCredits(companyId, numAmount, 'admin_adjustment', { reason: reason || '' }, req.userData._id);
    } else {
      const balance = getEffectiveBalance(company);
      const deduct = Math.min(balance, Math.abs(numAmount));
      if (deduct > 0) {
        await deductCredits(companyId, deduct, 'admin_adjustment', { reason: reason || '', adminReduction: true }, req.userData._id);
      }
    }
    const updated = await Company.findById(companyId).lean();
    const balanceAfter = getEffectiveBalance(updated);
    await logAdminAction(req, 'CREDITS_ADJUST', 'Company', companyId, {
      amount: numAmount,
      reason: reason || '',
      companyName: company.companyName,
      balanceAfter,
    });
    return res.status(200).json({
      message: 'Credits adjusted',
      companyId,
      amount: numAmount,
      balanceAfter,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to adjust credits', error: String(e?.message) });
  }
}

export default adminAuthMiddleware(handler);
