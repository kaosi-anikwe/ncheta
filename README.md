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
