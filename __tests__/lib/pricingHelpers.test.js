/**
 * Unit tests for lib/pricingHelpers.js pure functions (inlined to match lib logic).
 * Run: node --test __tests__/lib/pricingHelpers.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

function roundCredits(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function applyOffer(price, offer) {
  if (!offer || !price || price <= 0) return { discountedPrice: price, discountAmount: 0, offer: null };
  let discountAmount = 0;
  if (offer.discountType === 'percentage') {
    discountAmount = (price * Math.min(100, offer.discountValue)) / 100;
  } else {
    discountAmount = Math.min(price, offer.discountValue);
  }
  const discountedPrice = Math.max(0, price - discountAmount);
  return {
    discountedPrice: roundCredits(discountedPrice),
    discountAmount: roundCredits(discountAmount),
    offer: { _id: offer._id, title: offer.title, discountType: offer.discountType, discountValue: offer.discountValue },
  };
}

function applyPromoToPrice(price, promo) {
  if (!promo || !price || price <= 0) return { discountedPrice: price, discountAmount: 0 };
  let discountAmount = 0;
  if (promo.discountType === 'percentage') {
    discountAmount = (price * Math.min(100, promo.discountValue)) / 100;
  } else {
    discountAmount = Math.min(price, promo.discountValue);
  }
  const discountedPrice = Math.max(0, price - discountAmount);
  return {
    discountedPrice: roundCredits(discountedPrice),
    discountAmount: roundCredits(discountAmount),
  };
}

describe('pricingHelpers', () => {
  describe('applyOffer', () => {
    it('returns original price when offer is null or price <= 0', () => {
      assert.deepStrictEqual(applyOffer(100, null), {
        discountedPrice: 100,
        discountAmount: 0,
        offer: null,
      });
      assert.deepStrictEqual(applyOffer(0, { discountType: 'percentage', discountValue: 20 }), {
        discountedPrice: 0,
        discountAmount: 0,
        offer: null,
      });
    });
    it('applies percentage discount correctly', () => {
      const offer = { _id: 'o1', discountType: 'percentage', discountValue: 20 };
      const result = applyOffer(100, offer);
      assert.strictEqual(result.discountAmount, 20);
      assert.strictEqual(result.discountedPrice, 80);
      assert.strictEqual(result.offer?.discountValue, 20);
    });
    it('caps percentage at 100', () => {
      const offer = { _id: 'o1', discountType: 'percentage', discountValue: 150 };
      const result = applyOffer(100, offer);
      assert.strictEqual(result.discountAmount, 100);
      assert.strictEqual(result.discountedPrice, 0);
    });
    it('applies fixed discount correctly', () => {
      const offer = { _id: 'o1', discountType: 'fixed', discountValue: 30 };
      const result = applyOffer(100, offer);
      assert.strictEqual(result.discountAmount, 30);
      assert.strictEqual(result.discountedPrice, 70);
    });
    it('fixed discount does not exceed price', () => {
      const offer = { _id: 'o1', discountType: 'fixed', discountValue: 200 };
      const result = applyOffer(100, offer);
      assert.strictEqual(result.discountAmount, 100);
      assert.strictEqual(result.discountedPrice, 0);
    });
    it('rounds discounted price to 2 decimals', () => {
      const offer = { _id: 'o1', discountType: 'percentage', discountValue: 33 };
      const result = applyOffer(99, offer);
      assert.strictEqual(result.discountedPrice, 66.33);
      assert.strictEqual(result.discountAmount, 32.67);
    });
  });

  describe('applyPromoToPrice', () => {
    it('returns original price when promo is null or price <= 0', () => {
      assert.deepStrictEqual(applyPromoToPrice(100, null), {
        discountedPrice: 100,
        discountAmount: 0,
      });
      assert.deepStrictEqual(applyPromoToPrice(0, { discountType: 'percentage', discountValue: 10 }), {
        discountedPrice: 0,
        discountAmount: 0,
      });
    });
    it('applies percentage promo correctly', () => {
      const promo = { discountType: 'percentage', discountValue: 10 };
      const result = applyPromoToPrice(80, promo);
      assert.strictEqual(result.discountAmount, 8);
      assert.strictEqual(result.discountedPrice, 72);
    });
    it('applies fixed promo correctly', () => {
      const promo = { discountType: 'fixed', discountValue: 15 };
      const result = applyPromoToPrice(72, promo);
      assert.strictEqual(result.discountAmount, 15);
      assert.strictEqual(result.discountedPrice, 57);
    });
    it('fixed promo does not exceed price', () => {
      const promo = { discountType: 'fixed', discountValue: 100 };
      const result = applyPromoToPrice(50, promo);
      assert.strictEqual(result.discountAmount, 50);
      assert.strictEqual(result.discountedPrice, 0);
    });
  });
});
