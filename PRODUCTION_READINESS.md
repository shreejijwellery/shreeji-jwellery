# Production Readiness Checklist

Based on a review of the codebase, here’s what is in place and what’s left to make the product production-ready.

---

## Already in place

- **Auth**: JWT with `JWT_SECRET`, auth middleware, blocked user/company handling
- **Env**: `.env.example` for core vars; `.env*.local` in `.gitignore`
- **Security**: `poweredByHeader: false` in Next config; no obvious secrets in code
- **Payments**: Razorpay integration with webhook signature verification
- **API errors**: Consistent 4xx/5xx and JSON error responses
- **Referral**: Valid referral code at signup; credits on first purchase with 10% cap

---

## Recommended before production

### 1. Environment & config

- [ ] **Complete `.env.example`**  
  Add placeholders for all production env vars (so deploy docs are clear):
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (payments)
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` (if using S3/item images)
- [ ] **Production MongoDB**  
  Use a managed MongoDB (Atlas, etc.) with a proper connection string; avoid `localhost` in production.
- [ ] **Strong `JWT_SECRET`**  
  Generate a long random value (e.g. 32+ chars) and never commit it.

### 2. Security

- [ ] **Rate limiting**  
  Add rate limits on sensitive routes (e.g. `/api/login`, `/api/signup`, `/api/payments/razorpay/order`) to reduce brute-force and abuse. Use a middleware or a service (e.g. Upstash Redis, or in-memory for single-instance).
- [ ] **Security headers**  
  Consider adding headers (e.g. in `next.config.mjs` or middleware): `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and optionally `Content-Security-Policy`.
- [ ] **CORS**  
  If the frontend is on a different domain than the API, configure CORS (or rely on same-origin if everything is under one domain).
- [ ] **Input validation**  
  Validate and sanitize request bodies/query on critical APIs (signup, login, payment order, admin actions). Consider a schema lib (e.g. Zod, Joi) for API routes.

### 3. Reliability & operations

- [ ] **Health/readiness endpoint**  
  Add e.g. `GET /api/health` that checks DB (and optionally Razorpay config) and returns 200/503. Use this for load balancer or orchestrator health checks.
- [ ] **Structured logging**  
  Replace or wrap `console.log/error` in API routes with a small logger (with levels and request IDs) and avoid logging sensitive data (tokens, passwords, full request bodies).
- [ ] **Error tracking**  
  Integrate an error/monitoring service (e.g. Sentry) in `_app.js` and in API routes so production errors are reported and grouped.
- [ ] **Webhook retries**  
  Razorpay can retry webhooks; ensure your handler is idempotent (e.g. by payment/order id) so duplicate events don’t double-credit or double-charge.

### 4. Testing & quality

- [ ] **Automated tests**  
  No tests were found. Add at least:
  - A few critical API tests (e.g. signup with/without referral, login, token validation, credit deduct).
  - Optional: smoke E2E for login → pricing → one extraction flow.
- [ ] **CI**  
  Run `npm run build` and `npm run lint` (and tests when added) on every PR or main push.

### 5. Frontend & UX

- [ ] **Custom 404 page**  
  Add `pages/404.js` (and optionally `pages/500.js`) for a consistent experience when routes or server errors occur.
- [ ] **Error boundary**  
  Wrap the app (or key trees) in an error boundary so React errors don’t blank the screen; optionally report to your error-tracking service.

### 6. Documentation & deploy

- [ ] **Deployment doc**  
  Document: required env vars, build command (`npm run build`), start command (`npm run start`), and any platform-specific steps (Vercel, Docker, etc.).
- [ ] **Razorpay webhook**  
  Document the exact webhook URL and events (e.g. `payment.captured`) to configure in Razorpay dashboard, and that `RAZORPAY_WEBHOOK_SECRET` must match.

---

## Optional improvements

- **Backups**: Automated MongoDB backups and a simple restore procedure.
- **Feature flags**: If you need to turn features off without deploy, consider a minimal feature-flag layer (you already have company-level flags).
- **Audit**: Admin audit log exists; ensure sensitive actions (credit adjust, block, payment-related) are logged with enough context.
- **Performance**: Add caching where it helps (e.g. credit config, pack list) and ensure large lists (admin company list, etc.) are paginated or limited.

---

## Quick wins (minimal code)

1. Add `pages/404.js` with a simple “Page not found” and link back home.
2. Extend `.env.example` with Razorpay and AWS placeholders and short comments.
3. Add `GET /api/health` that pings MongoDB (and returns 503 if down).
4. Add security headers in `next.config.mjs` (e.g. `headers` async function).

If you tell me which area you want to tackle first (e.g. “env example”, “health endpoint”, “rate limit”, or “404 page”), I can outline or implement the exact code changes.
