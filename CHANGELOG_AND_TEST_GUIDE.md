# Changelog & Test Guide – Multi-tenant, Credits, Admin & Sort Features

This document lists **what was added/changed** and **what to test** for the recent work on credits, admin portal, extraction (Meesho/Snapdeal/Amazon), and optional CSV for Meesho.

---

## 1. Credit system (dynamic config & 2 decimals)

### What was added/changed
- **CreditSettings model** (`models/CreditSettings.js`): Global settings with `pagesPerCredit` and `pricePerCredit` (admin can change).
- **Backend**
  - `lib/creditsService.js`: `getCreditSettings()`, `roundCredits()`, `creditsRequiredForPages()` – credits required = ceil(pages / pagesPerCredit), rounded to 2 decimals. All balance/amount calculations use `roundCredits()`.
  - `getCreditsRequiredForPdfPages(pageCount)` uses DB settings. Deduct and add credit APIs use 2-decimal precision.
- **APIs**
  - `GET /api/credits/config` – returns `{ pagesPerCredit, pricePerCredit }` (no auth).
  - `GET/PUT /api/admin/credits/settings` – admin gets/updates global credit settings (admin auth only).
  - `POST /api/credits/deduct` – uses `getCreditsRequiredForPdfPages(pages)` for amount; responses use rounded values.
  - `GET /api/credits/balance` – returns balance and trial credits rounded to 2 decimals.
- **Frontend**
  - `utils/credits.js`: `getCreditsConfig()`, `creditsRequiredForPages()`, `checkCreditsForPages()`, `roundCredits()`, `formatCredits()`.
  - Layout and admin UI show credits with `.toFixed(2)` (e.g. `10.00`, `8.34`).

### What to test
- [ ] **Config API**: `GET /api/credits/config` returns `pagesPerCredit` and `pricePerCredit`.
- [ ] **Admin credit settings**: As ADMINISTRATOR, open Admin → “Credit settings” tab; change “Output pages per credit” (e.g. 1 or 2) and “Price per credit”; Save. GET config again and confirm new values.
- [ ] **Credits to 2 decimals**: Run an extraction, check balance before/after; confirm balances and deducted amounts show 2 decimals (e.g. 99.50, 8.34) in header and admin company list.
- [ ] **Rate applied**: Set e.g. `pagesPerCredit: 2`; process 10 pages; confirm 5 credits deducted (ceil(10/2)).

---

## 2. Administrator role (no company required)

### What was added/changed
- **adminAuthMiddleware** (`pages/api/common/common.services.js`): Auth for admin-only APIs. Verifies JWT + user is ADMINISTRATOR; does **not** require or load company. Sets `req.userData`, `req.companyData = null`.
- **All `/api/admin/*` routes** use `adminAuthMiddleware` instead of `authMiddleware(requireAdministrator(...))`:
  - `GET/PUT /api/admin/credits/settings`
  - `POST /api/admin/credits/adjust`
  - `GET /api/admin/users`, `POST /api/admin/block`
  - `GET /api/admin/audit`
  - `GET /api/admin/company`, `GET/PUT /api/admin/company/[id]`
- **validateToken**: If user is ADMINISTRATOR and has no company (or company not found), returns 200 with user and `creditBalance: 0` so login still works.
- **authMiddleware** (for non-admin routes): If user is ADMINISTRATOR and no company, attaches a **synthetic** `req.companyData` (all feature flags true) so `/api/company/flags` and other company-dependent APIs still work.
- **company/flags**: Uses `req.companyData` from middleware; when company is synthetic (no `_id`), PUT returns 400 with a clear message.

### What to test
- [ ] **Admin login without company**: Log in as ADMINISTRATOR user that has no `company` or deleted company. Confirm no “Company not found” and token validates; header shows 0 credits.
- [ ] **Admin APIs without company**: Same admin; call `PUT /api/admin/credits/settings` with body `{ "pagesPerCredit": 10, "pricePerCredit": 1 }` and Bearer token. Confirm 200 and settings updated.
- [ ] **Admin portal**: Open /admin; confirm Companies, Users, Audit Log, Credit settings tabs work; adjust credits for a company, block/unblock, change feature flags.
- [ ] **Company/flags for admin**: With admin (no company), open app; confirm feature flags load and sidebar shows (synthetic company). Updating “my” company flags via company/flags PUT should return 400 with “No company assigned” message.

---

## 3. Credit gating & deduction (Meesho, Snapdeal, Amazon)

### What was added/changed
- **Upfront check**: Before starting any of the three sorts, frontend calls `checkCreditsForPages(pdf.numPages)` (uses dynamic `pagesPerCredit`). If insufficient, shows “You don't have enough credits. Purchase credits to continue.” and does not start processing.
- **Post-processing deduction**: After successful client-side PDF sort, frontend calls `POST /api/credits/deduct` with `{ pages: outputPageCount }`. Deduct uses `getCreditsRequiredForPdfPages(pages)`. If 402, download is blocked and error shown.
- **Common logic**: Backend deduct and config use `lib/creditsService`; frontend uses `utils/credits.js` for config and `checkCreditsForPages`.
- **UI**: When feature is on but no credits, amber banner “You need credits… Purchase credits to continue.” and “Process”/submit buttons disabled; link to /pricing.
- **creditsUpdated event**: After successful deduct, frontend dispatches `creditsUpdated`; Layout listens and refetches user so header balance updates.

### What to test
- [ ] **Meesho**: With enough credits, process PDF (with or without CSV); after download, confirm credits deducted and header balance updates. With 0 credits, confirm upfront error and button disabled; after adding credits, confirm flow works.
- [ ] **Snapdeal**: Same: enough credits → process → deduct and balance update; no credits → error and disabled button.
- [ ] **Amazon**: Same as above.
- [ ] **Insufficient mid-flow**: If balance drops below required before deduct (e.g. another tab used credits), deduct returns 402; confirm error message and no download.

---

## 4. Meesho sort – CSV/Excel optional, sort by SKU

### What was added/changed
- **CSV/Excel optional**: Only PDF is required. Validation: “Please select a PDF file” if no PDF; no error if CSV/Excel missing.
- **Process Files button**: Enabled when PDF is selected (and has credits + feature); removed `!selectedCsvFile` from disabled condition.
- **Sort**
  - **With CSV/Excel**: Sort order unchanged – qty → origin → company.
  - **Without CSV/Excel**: Sort by **SKU → qty → company** (aligned with Snapdeal/Amazon when no CSV).
- **Labels on output PDF**
  - **With CSV/Excel**: “Origin : &lt;originName&gt;” and origin count badge when applicable.
  - **Without CSV/Excel**: “SKU: &lt;sku&gt; | Qty: &lt;qty&gt;” on each page.
- **UI**: CSV/Excel label says “(optional – without it, sorted by SKU)”; CSV input no longer `required`.

### What to test
- [ ] **PDF only**: Upload only PDF (no CSV/Excel). Confirm “Process Files” is enabled; process; confirm output is sorted by SKU and each page shows “SKU: … | Qty: …”.
- [ ] **PDF + CSV**: Upload PDF and CSV/Excel; process; confirm sort by qty/origin/company and “Origin : …” on pages; origin count badge when applicable.
- [ ] **Validation**: Submit with no PDF: “Please select a PDF file”. With only PDF: no error, processing runs.

---

## 5. Feature flags & navigation (extraction tabs, home)

### What was added/changed
- **Company flags**: `isMeeshoSort`, `isSnapdealSort`, `isAmazonSort` (default true for new companies). GET `/api/company/flags` normalizes missing keys to defaults.
- **Layout**
  - “SKU Management” in sidebar: shown if user has permission and at least one of `isExtractSKU`, `isMeeshoSort`, `isSnapdealSort`, `isAmazonSort` is true.
  - “Home” tab: only if `isDashboard` and user has WORKER_BILLS permission (so home has content).
  - Submenu under SKU Management: Meesho/Snapdeal/Amazon/Generate Excel/etc. only if corresponding flag is on.
- **extract-sku page**: Tab buttons (Meesho, Snapdeal, Amazon, Generate Excel, etc.) only rendered when their feature flag is on. Buttons disabled when no credits or loading.
- **Redirect**: If user has SKU access but home has no content (`isDashboard` off or no WORKER_BILLS), redirect from `/` to `/extract-sku`.
- **Role**: ADMINISTRATOR (and admin/manager) can access extraction; `checkPermission` and extract-sku role check include ADMINISTRATOR.

### What to test
- [ ] **Flags on**: Company with Meesho/Snapdeal/Amazon on; confirm “SKU Management” and submenu and tabs visible; each sort works when credits available.
- [ ] **Flags off**: Turn off e.g. Meesho for a company; confirm Meesho tab hidden in sidebar and on extract-sku page.
- [ ] **Home vs SKU**: Company with only sort flags (no dashboard / no worker bills); confirm no “Home” in sidebar and redirect from `/` to `/extract-sku`.
- [ ] **Manager/ADMINISTRATOR**: Log in as manager or ADMINISTRATOR with sort flags on; confirm SKU Management and tabs visible and usable.

---

## 6. Hydration & token/refresh

### What was added/changed
- **useFeatureFlags**: Initial state no longer reads from `localStorage` (avoids hydration mismatch); cache read in `useEffect` after mount.
- **extract-sku page**: “Mounted” state; main content renders only after mount so SSR and first client render match; direct navigation to `/extract-sku` does not hydrate error.
- **Layout**: Refreshes feature flags after successful validateToken on load; listens for `creditsUpdated` and refetches user to update header balance.

### What to test
- [ ] **Direct URL**: Open `/extract-sku` in new tab or refresh; no React hydration error.
- [ ] **Credits update**: After Meesho/Snapdeal/Amazon deduct, header “Credits: X.XX” updates without full reload.

---

## 7. Admin audit & credit adjust

### What was added/changed
- Admin credit adjust and block/unblock already use `logAdminAction`. Credit settings PUT logs `CREDIT_SETTINGS_UPDATE`.
- Admin Audit Log tab shows recent actions (who, action, target, details).

### What to test
- [ ] Change credit settings, adjust company credits, block a user/company; open Admin → Audit Log and confirm entries with correct action and details.

---

## Quick test matrix

| Area              | Test briefly |
|-------------------|-------------|
| Credit config     | Admin → Credit settings: change pages/price per credit, save, run extraction and check deduction. |
| 2 decimals        | Check balance and deducted amounts in header, balance API, admin company list (e.g. 10.00, 8.34). |
| Admin no company  | Login as ADMINISTRATOR without company; validate token; call PUT admin/credits/settings; use Admin portal. |
| Meesho no CSV     | PDF only → Process Files enabled; process; output sorted by SKU, labels “SKU: … \| Qty: …”. |
| Meesho with CSV   | PDF + CSV → sort by origin/qty/company; “Origin : …” and count badge. |
| Snapdeal/Amazon   | With/without credits: upfront error when no credits; after process, deduct and balance update. |
| Flags & nav       | Toggle company flags; check sidebar and extract-sku tabs; redirect from / when home empty. |
| Hydration         | Direct open /extract-sku; no hydration error. |

---

## Files touched (reference)

- **Models**: `CreditSettings.js`, `company.js` (flags).
- **Lib**: `creditsService.js`, `constants.js` (ADMINISTRATOR permission), `creditConfig.js`.
- **Utils**: `credits.js`, `useFeatureFlags.js`.
- **API**: `validateToken.js`, `credits/balance.js`, `credits/deduct.js`, `credits/config.js`, `company/flags.js`, `processFiles.js`, `common.services.js` (auth + adminAuth), all under `api/admin/` (credits/settings, credits/adjust, block, users, audit, company).
- **Pages**: `extract-sku.js`, `admin.js`, `index.js` (redirect), `pricing.js` (if changed earlier).
- **Components**: `Layout.js`, `SnapdealSort.js`, `AmazonSort.js`.

Use this for regression testing and for onboarding (what’s new and what to verify).
