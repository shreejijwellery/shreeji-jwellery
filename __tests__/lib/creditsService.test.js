/**
 * Unit tests for lib/creditsService.js pure functions (inlined to avoid ESM path resolution).
 * Run: node --test __tests__/lib/creditsService.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

function roundCredits(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function getEffectiveBalance(company) {
  if (!company) return 0;
  const balance = Number(company.creditBalance) || 0;
  const trialExpiresAt = company.trialCreditsExpiresAt ? new Date(company.trialCreditsExpiresAt) : null;
  const trialGranted = Number(company.trialCreditsGranted) || 0;
  const now = new Date();
  const trialStillActive = trialExpiresAt && trialExpiresAt > now && trialGranted > 0;
  const trialRemaining = trialStillActive ? roundCredits(trialGranted) : 0;
  return roundCredits(balance + trialRemaining);
}

function creditsRequiredForPages(pageCount, pagesPerCredit = 1) {
  if (pageCount <= 0) return 0;
  const rate = Number(pagesPerCredit) || 1;
  const raw = pageCount / rate;
  const roundedUp = Math.ceil(raw * 100) / 100;
  return roundCredits(Math.max(0.01, roundedUp));
}

function isTrialActive(company) {
  if (!company) return false;
  const trialExpiresAt = company.trialCreditsExpiresAt ? new Date(company.trialCreditsExpiresAt) : null;
  return trialExpiresAt && trialExpiresAt > new Date() && (Number(company.trialCreditsGranted) || 0) > 0;
}

describe('creditsService', () => {
  describe('roundCredits', () => {
    it('rounds to 2 decimal places', () => {
      assert.strictEqual(roundCredits(10.123), 10.12);
      assert.strictEqual(roundCredits(10.126), 10.13);
      assert.strictEqual(roundCredits(10.124), 10.12);
      assert.strictEqual(roundCredits(10.125), 10.13); // Math.round(10.125*100)/100
    });
    it('returns 0 for null, undefined, NaN', () => {
      assert.strictEqual(roundCredits(null), 0);
      assert.strictEqual(roundCredits(undefined), 0);
      assert.strictEqual(roundCredits(NaN), 0);
    });
    it('handles integers', () => {
      assert.strictEqual(roundCredits(50), 50);
      assert.strictEqual(roundCredits(0), 0);
    });
  });

  describe('getEffectiveBalance', () => {
    it('returns creditBalance when no trial', () => {
      assert.strictEqual(getEffectiveBalance({ creditBalance: 100 }), 100);
      assert.strictEqual(getEffectiveBalance({ creditBalance: 0 }), 0);
    });
    it('adds trial credits when trial is active (valid date, granted > 0)', () => {
      const future = new Date(Date.now() + 86400000);
      const company = {
        creditBalance: 10,
        trialCreditsGranted: 50,
        trialCreditsExpiresAt: future,
      };
      assert.strictEqual(getEffectiveBalance(company), 60);
    });
    it('ignores trial when expired', () => {
      const past = new Date(Date.now() - 86400000);
      const company = {
        creditBalance: 10,
        trialCreditsGranted: 50,
        trialCreditsExpiresAt: past,
      };
      assert.strictEqual(getEffectiveBalance(company), 10);
    });
    it('ignores trial when trialCreditsGranted is 0', () => {
      const future = new Date(Date.now() + 86400000);
      const company = {
        creditBalance: 20,
        trialCreditsGranted: 0,
        trialCreditsExpiresAt: future,
      };
      assert.strictEqual(getEffectiveBalance(company), 20);
    });
    it('returns 0 for null/undefined company', () => {
      assert.strictEqual(getEffectiveBalance(null), 0);
      assert.strictEqual(getEffectiveBalance(undefined), 0);
    });
  });

  describe('creditsRequiredForPages', () => {
    it('returns 0 for pageCount <= 0', () => {
      assert.strictEqual(creditsRequiredForPages(0), 0);
      assert.strictEqual(creditsRequiredForPages(-1), 0);
    });
    it('with pagesPerCredit 1: 1 page = 1 credit', () => {
      assert.strictEqual(creditsRequiredForPages(1, 1), 1);
      assert.strictEqual(creditsRequiredForPages(10, 1), 10);
    });
    it('with pagesPerCredit 2: 10 pages = 5 credits', () => {
      assert.strictEqual(creditsRequiredForPages(10, 2), 5);
      assert.strictEqual(creditsRequiredForPages(11, 2), 5.5);
    });
    it('rounds up to 2 decimals', () => {
      assert.strictEqual(creditsRequiredForPages(3, 2), 1.5);
      assert.strictEqual(creditsRequiredForPages(1, 3), 0.34);
    });
    it('minimum 0.01', () => {
      assert.ok(creditsRequiredForPages(1, 100) >= 0.01);
    });
  });

  describe('isTrialActive', () => {
    it('returns true when trial not expired and granted > 0', () => {
      const future = new Date(Date.now() + 86400000);
      assert.strictEqual(
        isTrialActive({
          trialCreditsGranted: 50,
          trialCreditsExpiresAt: future,
        }),
        true
      );
    });
    it('returns false when trial expired', () => {
      const past = new Date(Date.now() - 86400000);
      assert.strictEqual(
        isTrialActive({
          trialCreditsGranted: 50,
          trialCreditsExpiresAt: past,
        }),
        false
      );
    });
    it('returns false when trialCreditsGranted is 0', () => {
      const future = new Date(Date.now() + 86400000);
      assert.strictEqual(
        isTrialActive({
          trialCreditsGranted: 0,
          trialCreditsExpiresAt: future,
        }),
        false
      );
    });
    it('returns false for null company', () => {
      assert.strictEqual(isTrialActive(null), false);
    });
  });
});
