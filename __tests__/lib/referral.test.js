/**
 * Unit tests for referral bonus logic (mirrors webhook: 10% of plan price, cap 200).
 * Run: node --test __tests__/lib/referral.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

const REFERRAL_BONUS_PERCENT = 0.1;
const REFERRAL_BONUS_CAP_CREDITS = 200;

function computeReferrerCredits(planPrice) {
  const raw = Math.round(Number(planPrice) * REFERRAL_BONUS_PERCENT);
  return Math.min(REFERRAL_BONUS_CAP_CREDITS, raw);
}

describe('referral bonus', () => {
  it('10% of plan price', () => {
    assert.strictEqual(computeReferrerCredits(100), 10);
    assert.strictEqual(computeReferrerCredits(399), 40);
    assert.strictEqual(computeReferrerCredits(1000), 100);
  });
  it('caps at 200 credits', () => {
    assert.strictEqual(computeReferrerCredits(3000), 200);
    assert.strictEqual(computeReferrerCredits(2500), 200);
    assert.strictEqual(computeReferrerCredits(2000), 200);
    assert.strictEqual(computeReferrerCredits(1999), 200);
  });
  it('below cap uses 10%', () => {
    assert.strictEqual(computeReferrerCredits(1990), 199);
  });
  it('zero plan price gives 0', () => {
    assert.strictEqual(computeReferrerCredits(0), 0);
  });
});
