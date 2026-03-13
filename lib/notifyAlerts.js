/**
 * Optional Slack alerts when someone signs up or purchases a plan.
 * Set SLACK_WEBHOOK_URL in .env to enable (create at api.slack.com/messaging/webhooks).
 */

function getSlackWebhook() {
  const url = process.env.SLACK_WEBHOOK_URL;
  return url && url.startsWith('https://') ? url : null;
}

async function postSlack(text) {
  const url = getSlackWebhook();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error('[notifyAlerts] Slack error:', e?.message);
  }
}

/**
 * Call after a successful signup. Does not block the response.
 * @param {{ companyName: string, userName: string, username: string, mobileNumber?: string, referralCode?: string, address?: string }} data
 */
export async function notifySignup(data) {
  const { companyName, userName, username, mobileNumber, referralCode, address } = data || {};
  const slackText = [
    '🆕 *New signup*',
    `Company: ${companyName || '—'}`,
    `Customer: ${userName || '—'} (@${username || '—'})`,
    mobileNumber ? `Mobile: ${mobileNumber}` : null,
    address ? `Address: ${address}` : null,
    referralCode ? `Referral code used: ${referralCode}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await postSlack(slackText);
}

/**
 * Call after a successful credit purchase (Razorpay webhook). Does not block the response.
 * @param {{ companyName: string, companyId: string, customerName?: string, address?: string, packName: string, credits: number, amountPaid?: number, currency?: string, paymentId?: string }} data
 */
export async function notifyPurchase(data) {
  const { companyName, companyId, customerName, address, packName, credits, amountPaid, currency, paymentId } = data || {};
  const slackText = [
    '💰 *New purchase*',
    `Company: ${companyName || '—'} (${companyId || '—'})`,
    customerName ? `Customer: ${customerName}` : null,
    address ? `Address: ${address}` : null,
    `Pack: ${packName || '—'} · ${credits ?? 0} credits`,
    amountPaid != null && currency ? `Amount: ${currency || 'INR'} ${amountPaid}` : null,
    paymentId ? `Payment ID: ${paymentId}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await postSlack(slackText);
}
