/**
 * Get client IP from request (works behind proxy/load balancer).
 * For analytics/abuse detection only – do not rely for security.
 */
export function getClientIp(req) {
  if (!req) return null;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    if (first) return first.trim();
  }
  if (req.headers['x-real-ip']) return req.headers['x-real-ip'].trim();
  if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].trim();
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  return null;
}
