# Ncheta Magazine

An independent African art and culture media company dedicated to documenting, preserving, and amplifying the stories of artists, cultural practitioners, and creative movements across Africa and the global African diaspora.

---

## 🛠️ Technology Stack

- **Framework**: [Astro v5](https://astro.build/)
- **CMS**: [Sanity Studio v3](https://www.sanity.io/) (`@sanity/client`)
- **Styling**: Vanilla CSS & [TailwindCSS v4](https://tailwindcss.com/)
- **Hosting & Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) & Cloudflare Functions
- **Search**: [Pagefind](https://pagefind.app/)
- **OG Image Generation**: [Sharp](https://sharp.pixelplumbing.com/) & SVG Vector Templates
- **Newsletter**: Kit (formerly ConvertKit) API integration via Cloudflare Pages Function
- **CRM**: [HubSpot](https://www.hubspot.com/) for contact form submissions via Cloudflare Pages Function

---

## 📁 Project Structure

```text
ncheta/
├── functions/               # Cloudflare Pages Functions
│   └── api/
│       ├── newsletter.ts    # Kit newsletter subscriber integration
│       └── inbound.ts       # Contact form webhook handling
├── scripts/
│   ├── generate-og-images.js# Pre-bakes 1200x630 OG social cards with absolute URLs
│   └── seed-sanity.js       # Seeds categories, nested navigation, & sample editorials
├── src/
│   ├── components/          # Astro UI & navigation components
│   │   ├── cards/           # Article card variants (hero, medium, small, text)
│   │   └── navigation/      # Header (nested dropdowns) & Footer
│   ├── pages/               # Astro routes
│   │   ├── index.astro      # Homepage (Latest section + category sections with subcat chips)
│   │   └── magazine/        # Dynamic category & article detail routes
│   └── sanity/
│       ├── client.ts        # Sanity client configuration
│       ├── queries.ts       # GROQ query methods
│       └── types.ts         # TypeScript interfaces (Category, Article, Navigation)
├── studio/                  # Sanity Studio CMS project
│   └── schemaTypes/         # Category, Editorial, Author, NavigationSettings schemas
├── docs/
│   └── HYBRID_SSR_GUIDE.md  # Detailed Hybrid SSR & Cloudflare deployment guide
└── wrangler.jsonc           # Cloudflare Pages configuration
```

---

## 🚀 Key Features

### 1. Nested Navigation & Subcategories

- Support for top-level categories and nested subcategories (e.g. _Meet the Artist_ under _Interviews_, _Reviews_ & _Critique_ under _Exhibitions & Fairs_).
- Desktop hover dropdown menus and mobile collapsible sub-navigation in [Header.astro](file:///c:/Users/anikw/Documents/projects/ncheta/src/components/navigation/Header.astro).
- Category sub-navigation tabs & hierarchical breadcrumbs on category pages.

### 2. Configurable Homepage Capping & Featured Articles

- `maxHomepageCategories` (default: 5) and `maxArticlesPerCategory` (default: 9) managed via Sanity `navigationSettings`.
- Ability to pin specific `featuredArticles` per category on the homepage.
- Fixed 9-article "Latest" section pre-pended at the top of the homepage.

### 3. Open Graph (OG) WhatsApp & Social Preview Support

- Generates 1200×630 PNG social preview cards with fully qualified absolute URLs (`https://nchetamagazine.com/og/home.png`).
- Standard Open Graph tags including `og:image:secure_url`, `og:image:type`, `og:image:width`, and `og:image:height` for WhatsApp, Facebook, LinkedIn, Twitter, and iMessage compatibility.

---

## 📦 Local Development & Commands

```bash
# Start Astro local dev server
npm run dev

# Run background Astro dev server (as specified in AGENTS.md)
astro dev --background

# Check build & static page generation
npm run build

# Seed Sanity Studio with default categories, navigation, and articles
node scripts/seed-sanity.js --seed

# Deploy to Cloudflare Pages
npm run deploy
```

---

## 🌩️ Deployment & Hybrid SSR Mode

- For instructions on switching from purely static output to **Hybrid SSR Mode** with `@astrojs/cloudflare` on Cloudflare Pages, see [HYBRID_SSR_GUIDE.md](docs/HYBRID_SSR_GUIDE.md).

---

## 🛒 Book Store — Deployment Checklist

The store requires Cloudflare D1, R2, and several secrets. Complete these steps before going live:

### 1. Create Cloudflare resources

```bash
# Create D1 database — copy the database_id from the output
wrangler d1 create ncheta-store

# Apply schema migrations
wrangler d1 execute ncheta-store --file=migrations/0001_create_store_tables.sql

# Create R2 bucket for digital files (private — no public access)
wrangler r2 bucket create ncheta-digital-books

# Regenerate TypeScript bindings
wrangler types
```

Update `wrangler.jsonc` with the real `database_id` from step 1.

### 2. Set Cloudflare secret environment variables

In the Cloudflare Pages dashboard → Settings → Environment Variables (mark each as a **Secret**):

| Variable | Description |
|---|---|
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_live_…`) |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook secret |
| `DHL_API_KEY` | DHL Express API key |
| `DHL_API_SECRET` | DHL Express API secret |
| `DHL_ACCOUNT_NUMBER` | DHL account number |
| `RESEND_API_KEY` | Resend API key (`re_…`) |
| `EMAIL_FROM_ADDRESS` | From address (e.g. `store@nchetamagazine.com`) |
| `EMAIL_FROM_NAME` | From name (e.g. `Ncheta Magazine`) |
| `STORE_PO_EMAIL` | Physical order notification email (`hello@nchetamagazine.com`) |
| `ADMIN_USERNAME` | Admin panel username |
| `ADMIN_PASSWORD` | Admin panel password |
| `ADMIN_SESSION_SECRET` | 32+ character random string for HMAC signing |
| `SANITY_WRITE_TOKEN` | Sanity token with write permissions (for R2 key patching) |

### 3. Register Paystack webhook

In the Paystack dashboard, register:
`https://nchetamagazine.com/api/webhooks/paystack`

Events to subscribe: `charge.success`, `refund.processed`

### 4. Add books in Sanity Studio

- Create book entries with the `book` schema: title, slug, cover image, formats (PDF/EPUB/physical)
- For physical books: set weight (kg) and dimensions (cm) per format
- Configure `storeSettings` singleton: DHL origin address, tax rate, buffer days, etc.

### 5. Rate limiting (Cloudflare dashboard)

Add a rate limiting rule in Cloudflare WAF for:
- `/api/store/checkout` — max 5 requests per minute per IP
- `/api/store/verify-email` — max 3 requests per 10 minutes per IP

### 6. Admin panel

Access at `/admin/orders`. Credentials are set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars.
