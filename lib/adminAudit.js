import AdminAuditLog from '../models/AdminAuditLog';

export async function logAdminAction(req, action, targetType, targetId, details = {}) {
  const adminUserId = req.userData?._id;
  if (!adminUserId) return;
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  await AdminAuditLog.create({
    adminUserId,
    action,
    targetType,
    targetId,
    details,
    ip,
    userAgent,
  });
}
