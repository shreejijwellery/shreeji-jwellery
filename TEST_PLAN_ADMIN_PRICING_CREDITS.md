# Test Plan: Admin Pricing, Offers, Referral & Credits

Use this checklist to test admin pricing, offers, promo codes, referral flow, and credit deductions (including UI and APIs).

---

## Prerequisites

- App running: `npm run dev`
- MongoDB with test data (or use a staging DB)
- **Admin user**: One user with `role: 'ADMINISTRATOR'` (for admin pricing UI and APIs)
- **Company user**: One company/user with `role: 'manager'` (for pricing page, purchase flow, referral)
- Optional: Razorpay test keys for payment flow; or mock webhook for referral credits

---

## 1. Unit tests (no server)

Run pure logic tests:

```bash
node --test __tests__/lib/creditsService.test.js __tests__/lib/pricingHelpers.test.js __tests__/lib/referral.test.js
```

Or add to `package.json`:

```json
"scripts": {
  "test": "node --test __tests__/lib/"
}
```

Then: `npm test`

**Coverage:**

- **creditsService**: `roundCredits`, `getEffectiveBalance`, `creditsRequiredForPages`, `isTrialActive`
- **pricingHelpers**: `applyOffer` (percentage/fixed), `applyPromoToPrice`
- **referral**: 10% of plan price, cap 200 credits

---

## 2. Admin Pricing UI

### 2.1 Access

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as **ADMINISTRATOR** | Success |
| 2 | Go to Admin (e.g. /admin) | Admin dashboard loads |
| 3 | Open “Pricing & Offers” or navigate to **/admin-pricing** | Pricing page with tabs: Packs, Offers, Promo codes |

### 2.2 Credit Packs tab

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Create pack | Fill Pack ID (e.g. `pack_100`), Name, Credits, Price; Submit | Pack created, appears in list |
| 2 | Create duplicate pack | Create again with same Pack ID | Error: “Pack with this packId already exists” |
| 3 | Edit pack | Click Edit on a pack; change Name/Credits/Price; Save | Pack updated in list |
| 4 | Delete pack | Click Delete; confirm | Pack removed from list |
| 5 | Validation | Submit with empty Pack ID or Name or Credits or Price | Toast/validation: fill required fields |
| 6 | Popular / Active | Toggle Popular and Active on create/edit | Values persist (popular badge on pricing page; inactive pack not shown on public pricing) |

### 2.3 Offers tab

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Create percentage offer | Title, discountType=percentage, discountValue=20, validFrom/To (future range), Submit | Offer created |
| 2 | Create fixed offer | discountType=fixed, discountValue=50, valid dates | Offer created |
| 3 | Pack restriction | Set “Pack IDs” (e.g. `pack_500`) | Offer applies only to that pack on pricing page |
| 4 | Edit/Delete offer | Edit dates or value; Delete an offer | Changes persist; offer removed |
| 5 | Validation | Submit without title or discount value or dates | Error: fill required fields |
| 6 | Date range | validTo < validFrom | Offer not valid (no crash); pricing page shows no discount for that offer |

### 2.4 Promo codes tab

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Create promo | Code (e.g. `SAVE20`), percentage/fixed, value, validFrom/To, maxTotalUses (0=unlimited), maxUsesPerCompany=1 | Promo created |
| 2 | Pack IDs | Set comma-separated pack IDs | Promo applies only to those packs |
| 3 | Apply on pricing | Log in as company user; go to /pricing; select pack; enter code; Apply | Final price updates, discount shown |
| 4 | Max uses per company | Use same code twice (same company); second time | Error or “already used” per validation logic |
| 5 | Expired/invalid | Use code with validTo in past or wrong code | “Invalid or expired code” (or similar) |
| 6 | Delete promo | Delete from admin | Code no longer valid on pricing |

---

## 3. Public Pricing page (/pricing)

### 3.1 Load and display

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Packs from DB | With packs in DB | Packs listed with name, price, credits |
| 2 | Offer applied | With active offer for a pack | Pack shows discounted “offer” price |
| 3 | No packs | Empty DB (no packs) | Fallback to default packs from config (if implemented) or empty state |
| 4 | Promo apply | Enter valid promo; click Apply | finalPrice updates, discount amount shown |

### 3.2 Apply promo API behaviour

- **No code**: `POST /api/credits/apply-promo` with `{ packId }` only → `valid: true`, `applied: false`, `finalPrice: priceAfterOffer`
- **Valid code**: `{ packId, code: 'SAVE20' }` → `valid: true`, `applied: true`, `finalPrice` reduced
- **Invalid code**: → `valid: false`, `message` with reason
- **Wrong pack**: Promo for pack_500 only, send pack_100 → `valid: false` (if packIds enforced)

---

## 4. Referral flow

### 4.1 Signup with referral code

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Valid code | Sign up new company with referral code of existing company | Signup success; company has `referredByCompanyId` set |
| 2 | Invalid code | Sign up with random/invalid code | Error: “Invalid referral code…” |
| 3 | No code | Sign up without referral code | Success; `referredByCompanyId` null |
| 4 | Referral code in URL | Open /signup?referralCode=XXX | Referral code field pre-filled |

### 4.2 Referrer’s referral section (UI)

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Show code | Log in as company with `referralCode`; go to /pricing | “Refer a friend” section with code and “Copy code” / “Copy signup link” |
| 2 | Copy code | Click “Copy code” | Code in clipboard; toast “Referral code copied” |
| 3 | Copy signup link | Click copy link button | URL like `/signup?referralCode=XXX` in clipboard |

### 4.3 Referral credits (first purchase)

- **Logic**: When referred company makes **first** purchase (Razorpay payment captured), webhook grants referrer **10% of plan price (rounded)** as credits, **capped at 200**.
- **One-time**: `referralCreditsGranted` set on company so referrer is only credited once.

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | First purchase | Referred company completes first payment (or mock webhook with `payment.captured` and notes: companyId, packId) | Referrer’s balance increases by min(200, round(planPrice * 0.1)) |
| 2 | Cap 200 | Plan price e.g. ₹3000 (10% = 300) | Referrer gets 200 credits (cap) |
| 3 | Second purchase | Same referred company pays again | Referrer does **not** get another referral bonus |
| 4 | Company without referrer | Company with no `referredByCompanyId` pays | No referral credits created |

**Unit test**: `__tests__/lib/referral.test.js` covers 10% and cap 200.

---

## 5. Credits deduction

### 5.1 Config

- **Credit settings**: Admin → Credit settings (or `GET/PUT /api/admin/credits/settings`).
- **pagesPerCredit**: e.g. 1 or 2. Credits required = ceil(pages / pagesPerCredit), rounded 2 decimals.

### 5.2 Deduct API

- **Endpoint**: `POST /api/credits/deduct`
- **Auth**: Bearer token (company user).
- **Body**: `{ "pages": number }` (output page count).

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Success | Valid token, sufficient balance, `pages: 5` | 200, `{ balanceAfter }`; balance decreased by credits for 5 pages |
| 2 | Insufficient | Balance 2, pages 10 (e.g. 10 credits required) | 402, message “Insufficient credits…”, `required`, `balance` in body |
| 3 | Invalid pages | `pages: 0` or missing | 400, “Invalid pages count” |
| 4 | No auth | No token or invalid token | 401 |

### 5.3 UI (Extract SKU / Meesho / Snapdeal / Amazon)

| # | Test case | Steps | Expected |
|---|-----------|--------|----------|
| 1 | Upfront check | User has 0 credits; open sort tab; select PDF | Message “You don’t have enough credits…” and/or Process disabled |
| 2 | After process | User has enough credits; process PDF; download | After success, `POST /api/credits/deduct` called; header balance updates (creditsUpdated event) |
| 3 | 402 during deduct | Balance exhausted by another tab/session before deduct | Deduct returns 402; error shown; no download |
| 4 | pagesPerCredit=2 | Admin sets 2 pages per credit; process 10 pages | 5 credits deducted |

---

## 6. API quick reference (for manual/automated checks)

- **Admin (Bearer = ADMINISTRATOR token)**  
  - `GET  /api/admin/packs`  
  - `POST /api/admin/packs` body: `packId, name, credits, price, currency?`  
  - `PUT  /api/admin/packs/[id]`  
  - `DELETE /api/admin/packs/[id]`  
  - `GET  /api/admin/offers`  
  - `POST /api/admin/offers` body: `title, discountType, discountValue, validFrom, validTo, packIds?`  
  - `GET  /api/admin/promos`  
  - `POST /api/admin/promos` body: `code, discountType, discountValue, validFrom, validTo, maxTotalUses?, maxUsesPerCompany?`  
  - `GET/PUT /api/admin/credits/settings`  

- **Authenticated (company user)**  
  - `GET  /api/credits/packs` – packs with offer prices  
  - `POST /api/credits/apply-promo` body: `{ packId, code? }`  
  - `POST /api/credits/deduct` body: `{ pages }`  
  - `GET  /api/credits/balance`  

- **Webhook (Razorpay)**  
  - `POST /api/payments/razorpay/webhook` – payment.captured: add credits, referral bonus, promo usage  

---

## 7. Checklist summary

- [ ] Unit tests: `node --test __tests__/lib/` all pass  
- [ ] Admin Pricing UI: Packs CRUD, Offers CRUD, Promos CRUD  
- [ ] Public /pricing: Packs and offer prices; apply promo; final price correct  
- [ ] Referral: Signup with valid/invalid code; referrer section; first purchase grants 10% (cap 200); second purchase no bonus  
- [ ] Credits: Deduct API 200/402/400/401; UI upfront check and post-process deduct; pagesPerCredit respected  
- [ ] Audit: Admin actions (pack/offer/promo create/update/delete, credit settings) logged in audit log  

---

## 8. UI automation (optional)

- **Playwright**: An optional E2E spec is in `e2e/admin-pricing.spec.js`. It checks:
  - Login page loads (username field, sign-in button).
  - Pricing page loads and shows pricing/sign-in/get-started.
  - Signup page has referral code field.
  - If `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set: login and open `/admin-pricing`, then check Packs/Offers tabs visible.

  To run (with app running on port 3000):

  ```bash
  npx playwright install
  BASE_URL=http://localhost:3000 npx playwright test e2e/admin-pricing.spec.js
  ```

  With admin credentials:

  ```bash
  ADMIN_USERNAME=youradmin ADMIN_PASSWORD=yourpass BASE_URL=http://localhost:3000 npx playwright test e2e/admin-pricing.spec.js
  ```

- **Manual UI**: Follow sections 2, 3, 4, 5 above for full UI coverage.

Use this plan for regression and for verifying new changes to admin pricing, offers, referral, and credits.
