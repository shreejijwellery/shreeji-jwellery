import Company from '../models/company';
import CreditTransaction from '../models/CreditTransaction';
import CreditSettings from '../models/CreditSettings';
import { TRIAL_CREDITS, TRIAL_DAYS } from './creditConfig';

const DEFAULT_PAGES_PER_CREDIT = 1;

/** Round credit amount to 2 decimal places (for storage and API responses). */
export function roundCredits(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

/** Get global credit settings (pagesPerCredit, pricePerCredit). Returns defaults if no doc. */
export async function getCreditSettings() {
  const doc = await CreditSettings.findOne({}).lean();
  if (!doc) {
    return {
      pagesPerCredit: DEFAULT_PAGES_PER_CREDIT,
      pricePerCredit: 1,
    };
  }
  return {
    pagesPerCredit: Number(doc.pagesPerCredit) || DEFAULT_PAGES_PER_CREDIT,
    pricePerCredit: Number(doc.pricePerCredit) ?? 1,
  };
}

/** Credits required for N output pages using current settings. Rounded up to 2 decimals. */
export function creditsRequiredForPages(pageCount, pagesPerCredit = 1) {
  if (pageCount <= 0) return 0;
  const rate = Number(pagesPerCredit) || 1;
  const raw = pageCount / rate;
  const roundedUp = Math.ceil(raw * 100) / 100;
  return roundCredits(Math.max(0.01, roundedUp));
}

export function getEffectiveBalance(company) {
  if (!company) return 0;
  const balance = Number(company.creditBalance) || 0;
  const trialExpiresAt = company.trialCreditsExpiresAt ? new Date(company.trialCreditsExpiresAt) : null;
  const trialGranted = Number(company.trialCreditsGranted) || 0;
  const now = new Date();
  const trialStillActive = trialExpiresAt && trialExpiresAt > now && trialGranted > 0;
  const trialRemaining = trialStillActive ? roundCredits(trialGranted) : 0;
  return roundCredits(balance + trialRemaining);
}

export function isTrialActive(company) {
  if (!company) return false;
  const trialExpiresAt = company.trialCreditsExpiresAt ? new Date(company.trialCreditsExpiresAt) : null;
  return trialExpiresAt && trialExpiresAt > new Date() && (Number(company.trialCreditsGranted) || 0) > 0;
}

export async function deductCredits(companyId, amount, type, metadata = {}, createdBy = null) {
  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found');
  const amountRounded = roundCredits(amount);
  const effective = getEffectiveBalance(company);
  if (effective < amountRounded) {
    return { ok: false, required: amountRounded, balance: effective };
  }
  const balanceBefore = roundCredits(Number(company.creditBalance) || 0);
  const trialGranted = roundCredits(Number(company.trialCreditsGranted) || 0);
  const trialExpiresAt = company.trialCreditsExpiresAt ? new Date(company.trialCreditsExpiresAt) : null;
  const trialActive = trialExpiresAt && trialExpiresAt > new Date() && trialGranted > 0;
  let deductFromTrial = 0;
  let deductFromBalance = amountRounded;
  if (trialActive && trialGranted > 0) {
    deductFromTrial = roundCredits(Math.min(trialGranted, amountRounded));
    deductFromBalance = roundCredits(amountRounded - deductFromTrial);
  }
  company.trialCreditsGranted = roundCredits(Math.max(0, trialGranted - deductFromTrial));
  company.creditBalance = roundCredits(Math.max(0, balanceBefore - deductFromBalance));
  await company.save();

  const balanceAfter = getEffectiveBalance(company);
  await CreditTransaction.create({
    company: companyId,
    amount: roundCredits(-amountRounded),
    type,
    balanceAfter,
    metadata: { ...metadata, deductFromTrial, deductFromBalance },
    createdBy,
  });
  return { ok: true, balanceAfter };
}

export async function addCredits(companyId, amount, type, metadata = {}, createdBy = null) {
  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found');
  const amountRounded = roundCredits(amount);
  const before = roundCredits(Number(company.creditBalance) || 0);
  company.creditBalance = roundCredits(before + amountRounded);
  await company.save();
  const balanceAfter = getEffectiveBalance(company);
  await CreditTransaction.create({
    company: companyId,
    amount: amountRounded,
    type,
    balanceAfter,
    metadata,
    createdBy,
  });
  return { ok: true, balanceAfter };
}

/** Async: credits required for PDF pages using DB settings. */
export async function getCreditsRequiredForPdfPages(pageCount) {
  const { pagesPerCredit } = await getCreditSettings();
  return creditsRequiredForPages(pageCount, pagesPerCredit);
}

/** Credits for Excel sheets (1 sheet = 1 credit for now; can add sheetsPerCredit later). */
export function getCreditsRequiredForExcelSheets(sheetCount) {
  return roundCredits(Math.max(1, Math.ceil(sheetCount)));
}
