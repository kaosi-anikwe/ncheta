# Ncheta Book Store — Setup & Testing Guide

This guide covers everything needed to get the store live and verify it works correctly end-to-end before launch.

---

## Table of Contents

1. [Infrastructure Setup](#1-infrastructure-setup)
2. [Environment Secrets](#2-environment-secrets)
3. [Sanity CMS Configuration](#3-sanity-cms-configuration)
4. [Local Development](#4-local-development)
5. [Adding Your First Book](#5-adding-your-first-book)
6. [End-to-End Test Flows](#6-end-to-end-test-flows)
7. [Admin Panel Walkthrough](#7-admin-panel-walkthrough)
8. [Pre-Launch Checklist](#8-pre-launch-checklist)
9. [Going Live](#9-going-live)

---

## 1. Infrastructure Setup

These steps only need to be done once. Mark them off as you go.

### Cloudflare D1 (database)
- [ ] Database created: `wrangler d1 create ncheta-store`
- [ ] `wrangler.jsonc` updated with the real `database_id`
- [ ] Schema applied: `npx wrangler d1 execute ncheta-store --remote --file=migrations/0001_create_store_tables.sql`

### Cloudflare R2 (digital file storage)
- [ ] R2 enabled in Cloudflare Dashboard (requires a payment method on file — free within limits)
- [ ] Bucket created: `npx wrangler r2 bucket create ncheta-digital-books`

### Paystack
- [ ] Webhook URL registered in Paystack Dashboard → Settings → API Keys & Webhooks:
  `https://nchetamagazine.com/api/webhooks/paystack`
- [ ] Events subscribed: `charge.success` and `refund.processed`
- [ ] Copy the webhook secret — you'll need it in the next section

---

## 2. Environment Secrets

All secrets are set via the Cloudflare Pages dashboard (Settings → Environment Variables) or in bulk via CLI.

### Bulk upload via CLI (recommended)

```bash
# 1. Generate a secure admin session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Create a temporary secrets file — fill in real values
cat > .secrets.json << 'EOF'
{
  "PAYSTACK_SECRET_KEY": "sk_test_...",
  "PAYSTACK_WEBHOOK_SECRET": "...",
  "DHL_API_KEY": "...",
  "DHL_API_SECRET": "...",
  "DHL_ACCOUNT_NUMBER": "...",
  "RESEND_API_KEY": "re_...",
  "EMAIL_FROM_ADDRESS": "store@nchetamagazine.com",
  "EMAIL_FROM_NAME": "Ncheta Magazine",
  "STORE_PO_EMAIL": "hello@nchetamagazine.com",
  "ADMIN_USERNAME": "...",
  "ADMIN_PASSWORD": "...",
  "ADMIN_SESSION_SECRET": "<output from node command above>",
  "SANITY_WRITE_TOKEN": "..."
}
EOF

# 3. Upload all at once
npx wrangler pages secret bulk .secrets.json --project-name ncheta-magazine

# 4. Delete the file — never commit it
rm .secrets.json
```

### Where to find each value

| Secret | Where to get it |
|--------|----------------|
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → Settings → API Keys |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack Dashboard → Settings → API Keys & Webhooks |
| `DHL_API_KEY` / `DHL_API_SECRET` / `DHL_ACCOUNT_NUMBER` | DHL MyDHL API portal |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `SANITY_WRITE_TOKEN` | Sanity Dashboard → API → Tokens → Add API Token (Editor role) |
| `ADMIN_SESSION_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

---

## 3. Sanity CMS Configuration

The studio is deployed to Sanity Cloud. After deploying schema changes (`cd studio && npx sanity deploy`), two new document types appear in the sidebar: **Book** and **Store Settings**.

### Store Settings (required before any orders work)

Go to your studio → **Store Settings** → create the singleton document:

| Field | Value |
|-------|-------|
| Store Open | Leave **off** until testing is complete |
| Default Currency | NGN |
| Tax Rate (%) | 7.5 |
| Low Stock Threshold | 3 |
| DHL Buffer Days | 3 |
| DHL Origin — Address Line 1 | Suite 19D, Block B, Anon Plaza |
| DHL Origin — Address Line 2 | Plot 1085 Joseph Gomwalk Way |
| DHL Origin — City | Abuja |
| DHL Origin — Postal Code | 900108 |
| DHL Origin — Country Code | NG |
| Download Token Expiry (hours) | 72 |
| Max Downloads Per Token | 3 |
| Store Email From | store@nchetamagazine.com |
| PO Notification Email | hello@nchetamagazine.com |

### Deploying schema changes to the cloud studio

```bash
cd studio
npx sanity deploy
```

Run this once after the initial setup. You only need to run it again if the schemas change.

---

## 4. Local Development

Two terminals needed for full local testing (live reload + Cloudflare bindings):

```bash
# Terminal 1 — Astro dev server (port 4321)
npm run dev

# Terminal 2 — Wrangler proxying to Astro (port 8788, has D1/R2/secrets)
npm run dev:wrangler
```

Open **http://localhost:8788** (not 4321) for local testing. Port 8788 has all bindings wired up.

### Local secrets file

Create `.dev.vars` in the project root (already gitignored):

```
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=...
DHL_API_KEY=...
DHL_API_SECRET=...
DHL_ACCOUNT_NUMBER=...
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=store@nchetamagazine.com
EMAIL_FROM_NAME=Ncheta Magazine
STORE_PO_EMAIL=hello@nchetamagazine.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=testpassword
ADMIN_SESSION_SECRET=<32-byte hex>
SANITY_WRITE_TOKEN=...
```

### Local D1 database

For local testing without touching the production database:

```bash
# Apply schema to local SQLite (creates .wrangler/state/v3/d1/...)
npx wrangler d1 execute ncheta-store --local --file=migrations/0001_create_store_tables.sql
```

Then temporarily remove `"remote": true` from the `d1_databases` entry in `wrangler.jsonc` while developing. Add it back before deploying.

---

## 5. Adding Your First Book

### In Sanity Studio

1. Go to your studio → **Book** → New Book
2. Fill in: Title, Slug (auto-generated), Cover Image, Description
3. Under **Formats**, add each format you want to sell:

   **For PDF / EPUB:**
   - Format: `pdf` or `epub`
   - Prices: add NGN price in kobo (e.g. 500000 = ₦5,000) and USD in cents (e.g. 1500 = $15.00)
   - R2 Key: leave blank for now — the file upload step sets this

   **For Physical:**
   - Format: `physical`
   - Prices: same as above
   - Weight (kg): e.g. `0.4`
   - Dimensions (cm): e.g. Length `21`, Width `15`, Height `2`

4. Publish the document. Copy the Sanity `_id` from the URL — you'll need it for the next step.

### Seed physical stock in D1

```bash
npx wrangler d1 execute ncheta-store --remote --command="
INSERT INTO book_inventory (id, book_id, book_slug, format, stock, reserved, sold)
VALUES (
  lower(hex(randomblob(16))),
  'PASTE_SANITY_ID_HERE',
  'your-book-slug',
  'physical',
  50, 0, 0
)"
```

Or use the Admin Inventory page (see section 7) — it creates the row automatically when you click **Add** for the first time.

### Upload digital files

1. Go to `/admin/upload`
2. Select the book and format (PDF or EPUB)
3. Upload the file (max 100 MB)
4. The endpoint stores the file in R2 and writes the R2 key back to Sanity automatically

---

## 6. End-to-End Test Flows

Use Paystack test mode. All test cards require OTP `123456` when prompted.

**Paystack test cards:**

| Card | Result |
|------|--------|
| `4084 0840 8408 4081` | Success |
| `4084 0800 0000 0409` | Insufficient funds |
| CVV: `408` · Expiry: any future date | — |

**Test email:** Use your own email address. Resend delivers real emails in test mode as long as the sender domain is verified, or use `onboarding@resend.dev` as `EMAIL_FROM_ADDRESS` during testing (Resend's sandbox sender).

---

### Flow 1: Digital-only purchase (PDF or EPUB)

1. Go to `/store` — verify book grid loads
2. Click a book → verify detail page shows format options and price
3. Select PDF or EPUB format → click **Add to Cart**
4. Go to `/store/cart` → verify item appears with correct price
5. Click **Checkout**
6. Enter your name and email → click **Send Verification Code**
7. Check your inbox for the 6-digit OTP → enter it → click **Verify**
8. Click **Pay** — you should be redirected to Paystack
9. Enter test card details → complete payment
10. You should be redirected to `/store/order/nch_...`

**Verify:**
- [ ] Order page shows status "Confirmed"
- [ ] Download links appear with expiry info
- [ ] Download link delivers the file (if R2 key is set on the book)
- [ ] Confirmation email arrives with download links
- [ ] Order appears in `/admin/orders`

---

### Flow 2: Physical-only purchase

1. Add a physical book to cart (stock must be seeded first)
2. Checkout → verify email → fill in customer name and phone
3. On Step 2 (Shipping): enter a delivery address and click **Get Shipping Quote**
4. Verify DHL rates appear → select one
5. Complete payment

**Verify:**
- [ ] DHL rates shown with estimated days (buffer applied)
- [ ] Order page shows shipping address and "Dispatched via DHL" message
- [ ] Confirmation email arrives (customer copy + PO notification to hello@nchetamagazine.com)
- [ ] In `/admin/inventory`, the book's **Reserved** count increased by 1
- [ ] After payment confirms (wait ~10 seconds or refresh), **Stock** decremented and **Sold** incremented

---

### Flow 3: Mixed order (digital + physical)

1. Add both a physical copy and a PDF of the same (or different) book to cart
2. Complete checkout — shipping step appears because of the physical item
3. Complete payment

**Verify:**
- [ ] Order type shows "mixed" in admin
- [ ] Download links appear on order page
- [ ] Shipping section also appears on order page
- [ ] Email contains both download links and shipping notice

---

### Flow 4: Stock edge cases

**Out of stock:**
1. In Sanity, set a physical book with 0 stock (or don't seed any)
2. Go to the book detail page
3. Verify "Out of stock" appears and the Add to Cart button is disabled

**Low stock:**
1. Set stock to 2 in D1 (`UPDATE book_inventory SET stock = 2 WHERE book_slug = '...'`)
2. Reload the book detail page
3. Verify "Only 2 left" badge appears

**Race condition protection:**
1. Add a physical book with stock = 1 to cart in two browser tabs simultaneously
2. Complete checkout in both — the second should receive a "sold out" error at the payment step

---

### Flow 5: OTP edge cases

- Enter wrong OTP code → verify error message appears
- Wait 10 minutes without verifying → try to use an old code → verify "code expired" error
- Try to reach `/store/checkout` without verifying email → verify Pay button stays disabled

---

## 7. Admin Panel Walkthrough

Go to `/admin` — you'll be redirected to `/admin/login`.

### Login

- Username and password set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
- Session lasts 24 hours (HttpOnly cookie, signed with HMAC-SHA256)

### Orders (`/admin/orders`)

- Paginated list of all orders, 25 per page
- Filter by status: All / Pending / Paid / Dispatched / Failed / Refunded
- Search by order reference, customer email, or customer name
- Click **View** to open order detail

### Order Detail (`/admin/orders/[ref]`)

Shows full order info: customer details, items with prices, shipping address, DHL service selected.

**To mark an order as dispatched:**
1. Order must be in `paid` status
2. Enter the DHL tracking number (optional but recommended)
3. Click **Confirm Dispatch**
4. Status updates to `dispatched` and a dispatch email is sent to the customer automatically

### Inventory (`/admin/inventory`)

- Lists all books that have a physical format in Sanity, cross-referenced with D1
- Books with no D1 row show **Not configured** — enter a quantity and click **Add** to initialise
- **Add stock**: increases stock by the entered quantity (e.g. received a new print run)
- **Set stock**: sets an absolute number (e.g. after a physical recount)
- Setting stock cannot go below currently reserved quantity (pending orders)
- **Orphaned Records** section at the bottom shows D1 rows for books deleted from Sanity — click **Remove** to clean up

### Upload (`/admin/upload`)

1. Select the book from the dropdown
2. Select format (PDF or EPUB)
3. Choose the file (max 100 MB)
4. Progress bar shows upload status
5. On success, the file is stored in R2 and the `r2Key` is written back to Sanity automatically

---

## 8. Pre-Launch Checklist

### Infrastructure
- [ ] All 13 secrets uploaded to Cloudflare Pages (production environment)
- [ ] Paystack webhook URL registered and tested with Paystack's simulator
- [ ] Cloudflare WAF rate limiting rules added:
  - `/api/store/checkout` → max 5 requests/minute/IP
  - `/api/store/verify-email` → max 3 requests/10 minutes/IP

### Content
- [ ] Store Settings document published in Sanity (DHL origin address confirmed correct)
- [ ] At least one book published with correct pricing in NGN and USD
- [ ] Physical books have weight and dimensions set (required for DHL quotes)
- [ ] Digital files uploaded and R2 keys visible in Sanity (check the book's format fields)
- [ ] Physical stock seeded in D1 (visible on `/admin/inventory`)

### Email
- [ ] Sender domain verified in Resend dashboard
- [ ] Test order confirmation email received and renders correctly
- [ ] PO notification email received for a physical test order
- [ ] Dispatch email tested from `/admin/orders/[ref]`

### Payments
- [ ] Paystack test-mode end-to-end flow passes (all three order types)
- [ ] Switch `PAYSTACK_SECRET_KEY` to live key (`sk_live_...`) when ready to go live

### Final check
- [ ] Run a live test purchase with a real card for a small amount (₦100 or $1 USD) before announcing to customers
- [ ] Confirm order appears in Paystack dashboard
- [ ] Confirm D1 order record is correct (`wrangler d1 execute ncheta-store --remote --command="SELECT * FROM orders ORDER BY created_at DESC LIMIT 1"`)

---

## 9. Going Live

1. **Switch Paystack keys** — update `PAYSTACK_SECRET_KEY` in Cloudflare Pages to `sk_live_...` and `PAYSTACK_WEBHOOK_SECRET` to the live webhook secret. Re-register the webhook URL in Paystack production settings.

2. **Enable the store** — in Sanity Studio → Store Settings → set **Store Open** to on. The `/store` page will switch from "Coming Soon" to the live book grid.

3. **Enable USD payments** — if selling in USD, ensure your Paystack account has USD enabled (requires Paystack approval). Until then, set all book prices only in NGN.

4. That's it. Orders start flowing to `/admin/orders` and physical order notifications go to `hello@nchetamagazine.com` automatically.

---

## Quick Reference: Useful Commands

```bash
# View recent orders in D1
npx wrangler d1 execute ncheta-store --remote --command="SELECT reference, status, customer_email, total_amount, currency FROM orders ORDER BY created_at DESC LIMIT 20"

# Check current inventory
npx wrangler d1 execute ncheta-store --remote --command="SELECT book_slug, stock, reserved, sold, (stock - reserved) as available FROM book_inventory"

# Manually add stock to a book
npx wrangler d1 execute ncheta-store --remote --command="UPDATE book_inventory SET stock = stock + 50 WHERE book_slug = 'your-book-slug'"

# View failed orders
npx wrangler d1 execute ncheta-store --remote --command="SELECT reference, customer_email, created_at FROM orders WHERE status = 'failed' ORDER BY created_at DESC"

# Release stuck reservations (order older than 2 hours, still pending)
npx wrangler d1 execute ncheta-store --remote --command="UPDATE book_inventory SET reserved = MAX(0, reserved - (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = 'pending' AND o.created_at < datetime('now', '-2 hours') AND oi.book_id = book_inventory.book_id AND oi.format = 'physical'))"
```
