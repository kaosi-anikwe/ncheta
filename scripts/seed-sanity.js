import fs from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

// Simple env loader
function loadEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("=");
    const key = parts[0].trim();
    let val = parts.slice(1).join("=").trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const projectId = env.PUBLIC_SANITY_PROJECT_ID || "fn5p79dp";
const dataset = env.PUBLIC_SANITY_DATASET || "production";
const token = env.SANITY_WRITE_TOKEN;

if (!token && process.argv.includes("--seed")) {
  console.error("Error: SANITY_WRITE_TOKEN is not defined in your .env file.");
  console.error("Please create a write token in https://sanity.io/manage and add it to your .env.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: "2026-07-02",
});

const AUTHORS = [
  { _id: "author-emeka", _type: "author", name: "Emeka Okafor", title: "Senior Editor" },
  { _id: "author-chisom", _type: "author", name: "Chisom Eze", title: "Associate Editor" },
  { _id: "author-adaeze", _type: "author", name: "Adaeze Nwosu", title: "Art Critic" },
  { _id: "author-samuel", _type: "author", name: "Samuel Agwu", title: "Contributing Editor" },
];

const CATEGORIES = [
  { _id: "cat-art-news", _type: "category", name: "Art News", slug: { _type: "slug", current: "art-news" } },
  { _id: "cat-academia", _type: "category", name: "Academia", slug: { _type: "slug", current: "academia" } },
  { _id: "cat-interviews", _type: "category", name: "Interviews", slug: { _type: "slug", current: "interviews" } },
  { _id: "cat-collecting-now", _type: "category", name: "Collecting Now", slug: { _type: "slug", current: "collecting-now" } },
  { _id: "cat-african-art-history", _type: "category", name: "African Art History", slug: { _type: "slug", current: "african-art-history" } },
  { _id: "cat-exhibitions-fairs", _type: "category", name: "Exhibitions & Fairs", slug: { _type: "slug", current: "exhibitions-fairs" } },
  { _id: "cat-galleries-museums", _type: "category", name: "Galleries & Museums", slug: { _type: "slug", current: "galleries-museums" } },
  { _id: "cat-awards", _type: "category", name: "Awards", slug: { _type: "slug", current: "awards" } },
];

const ARTICLES = [
  {
    title: "Venice Biennale 2026: African Pavilions Take Center Stage",
    slug: "venice-biennale-2026",
    primaryCategory: { _type: "reference", _ref: "cat-art-news" },
    publishedAt: "2026-06-28T12:00:00Z",
    author: { _type: "reference", _ref: "author-emeka" },
    excerpt: "With a record number of African national pavilions, this year's Biennale signals a tectonic shift in how the global art world engages with the continent.",
    imageUrl: "https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=1200&q=80",
    content: [
      {
        _type: "block",
        style: "normal",
        children: [{ _type: "span", text: "The 2026 Venice Biennale marks a historic turning point for African representation on the world's most prestigious stage. With record participation from multiple sub-Saharan countries, the conversations have shifted toward ownership of visual narratives." }]
      }
    ]
  },
  {
    title: "The Benin Bronzes: Restitution and the Politics of Return",
    slug: "benin-bronzes-restitution",
    primaryCategory: { _type: "reference", _ref: "cat-academia" },
    publishedAt: "2026-06-22T12:00:00Z",
    author: { _type: "reference", _ref: "author-chisom" },
    excerpt: "Five years after the landmark repatriation agreement, scholars and curators assess the lasting impact on global museum practice.",
    imageUrl: "https://images.unsplash.com/photo-1603039155534-f4a5d97be7a3?w=1200&q=80",
    content: [
      {
        _type: "block",
        style: "normal",
        children: [{ _type: "span", text: "Restitution is no longer a localized debate; it is a global cultural reorganization. This paper examines how returning historic bronzes directly enriches community history and sets legal precedents." }]
      }
    ]
  },
  {
    title: "Wangechi Mutu on World-Building and Afrofuturist Ecologies",
    slug: "wangechi-mutu",
    primaryCategory: { _type: "reference", _ref: "cat-interviews" },
    publishedAt: "2026-06-18T12:00:00Z",
    author: { _type: "reference", _ref: "author-adaeze" },
    excerpt: "The Nairobi-born artist discusses her latest permanent commission at the Met and the role of myth-making in contemporary sculpture.",
    imageUrl: "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=1200&q=80",
    content: [
      {
        _type: "block",
        style: "normal",
        children: [{ _type: "span", text: "In this exclusive interview, Wangechi Mutu unpacks the ecological metaphors in her work, detailing how merging organic mud models with machinery challenges Western depictions." }]
      }
    ]
  },
  {
    title: "Ghana's Art Market Sees 300% Growth in Five Years",
    slug: "ghana-art-market",
    primaryCategory: { _type: "reference", _ref: "cat-art-news" },
    publishedAt: "2026-06-15T12:00:00Z",
    author: { _type: "reference", _ref: "author-samuel" },
    excerpt: "New data from the African Art Market Report reveals unprecedented growth driven by diaspora collectors and institutional acquisitions.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    content: [
      {
        _type: "block",
        style: "normal",
        children: [{ _type: "span", text: "Accra's emerging galleries and resident curators are capturing the global secondary art market, creating sustainable local structures for young creators." }]
      }
    ]
  }
];

async function deleteEverything() {
  console.log("Cleaning up Sanity Studio documents...");
  try {
    const docTypes = ["editorial", "category", "author", "navigationSettings", "sanity.imageAsset"];
    for (const type of docTypes) {
      const docs = await client.fetch(`*[_type == $type]._id`, { type });
      if (docs.length > 0) {
        console.log(`Deleting ${docs.length} documents of type "${type}"...`);
        const tx = client.transaction();
        docs.forEach((id) => tx.delete(id));
        await tx.commit();
      }
    }
    console.log("Cleanup completed successfully!");
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

async function uploadImageFromUrl(url) {
  try {
    console.log(`Downloading image: ${url.split("?")[0]}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const asset = await client.assets.upload("image", buffer, {
      filename: `unsplash-${Date.now()}.jpg`,
    });
    return {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: asset._id,
      },
    };
  } catch (err) {
    console.error("Failed to upload image from URL, skipping...", err);
    return null;
  }
}

async function seedEverything() {
  console.log("Seeding Sanity Studio...");

  try {
    // 1. Create Authors
    console.log("Creating authors...");
    for (const author of AUTHORS) {
      await client.createOrReplace(author);
      console.log(`Created author: ${author.name}`);
    }

    // 2. Create Categories
    console.log("Creating categories...");
    for (const cat of CATEGORIES) {
      await client.createOrReplace(cat);
      console.log(`Created category: ${cat.name}`);
    }

    // 3. Create Articles
    console.log("Creating articles and uploading images...");
    for (const art of ARTICLES) {
      let imageAsset = null;
      if (art.imageUrl) {
        imageAsset = await uploadImageFromUrl(art.imageUrl);
      }

      const doc = {
        _type: "editorial",
        title: art.title,
        slug: { _type: "slug", current: art.slug },
        primaryCategory: art.primaryCategory,
        publishedAt: art.publishedAt,
        author: art.author,
        excerpt: art.excerpt,
        content: art.content,
        featuredImage: imageAsset || undefined,
      };

      const result = await client.create(doc);
      console.log(`Created article: "${result.title}"`);
    }

    // 4. Create Navigation Settings (Header Menu link references)
    console.log("Creating navigation settings...");
    const navDoc = {
      _id: "navigation-settings-global",
      _type: "navigationSettings",
      menuItems: [
        {
          _key: "nav-cat-1",
          _type: "categoryLink",
          category: { _type: "reference", _ref: "cat-art-news" },
        },
        {
          _key: "nav-cat-2",
          _type: "categoryLink",
          category: { _type: "reference", _ref: "cat-academia" },
        },
        {
          _key: "nav-cat-3",
          _type: "categoryLink",
          category: { _type: "reference", _ref: "cat-interviews" },
        },
        {
          _key: "nav-custom-1",
          _type: "customLink",
          label: "Services",
          url: "/services",
        },
        {
          _key: "nav-custom-2",
          _type: "customLink",
          label: "About",
          url: "/about",
        },
      ],
    };

    await client.createOrReplace(navDoc);
    console.log("Created navigation settings!");

    console.log("Seeding completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}

async function run() {
  if (process.argv.includes("--delete")) {
    await deleteEverything();
  } else if (process.argv.includes("--seed")) {
    await deleteEverything(); // Clean first
    await seedEverything();
  } else {
    console.log("Usage:");
    console.log("  node scripts/seed-sanity.js --seed      # Seeds the database (cleans existing first)");
    console.log("  node scripts/seed-sanity.js --delete    # Clears all documents from the studio");
  }
}

run();
