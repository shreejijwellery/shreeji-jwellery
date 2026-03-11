import { getCreditSettings } from '../../../../lib/creditsService';
import CreditSettings from '../../../../models/CreditSettings';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const settings = await getCreditSettings();
    return res.status(200).json(settings);
  }

  if (req.method === 'PUT') {
    const { pagesPerCredit, pricePerCredit } = req.body || {};
    const updates = {};
    if (typeof pagesPerCredit === 'number' && pagesPerCredit >= 0.1) {
      updates.pagesPerCredit = pagesPerCredit;
    }
    if (typeof pricePerCredit === 'number' && pricePerCredit >= 0) {
      updates.pricePerCredit = pricePerCredit;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide pagesPerCredit and/or pricePerCredit' });
    }
    const doc = await CreditSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();
    await logAdminAction(req.userData._id, 'CREDIT_SETTINGS_UPDATE', 'CreditSettings', doc?._id, { updates });
    return res.status(200).json({
      pagesPerCredit: doc?.pagesPerCredit ?? 1,
      pricePerCredit: doc?.pricePerCredit ?? 1,
    });
  }
}

export default adminAuthMiddleware(handler);
