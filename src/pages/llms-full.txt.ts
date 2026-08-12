import type { APIRoute } from "astro";
import { getAllCategories, getAllEditorials } from "../sanity/queries";
import type { Category, Article } from "../sanity/types";

const SITE = "https://nchetamagazine.com";

function articleUrl(article: Article): string {
  const cat = article.primaryCategory?.slug?.current ?? "";
  const slug = article.slug?.current ?? "";
  return `${SITE}/magazine/${cat}/${slug}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}

export const GET: APIRoute = async () => {
  let categories: Category[] = [];
  let articles: Article[] = [];

  try {
    [categories, articles] = await Promise.all([
      getAllCategories(),
      getAllEditorials(),
    ]);
  } catch {
    // Proceed with empty arrays if Sanity is unreachable at build time
  }

  const topLevel = categories.filter((c) => !c.parentCategory);
  const subCategories = categories.filter((c) => !!c.parentCategory);

  const byCategory = new Map<string, Article[]>();
  for (const article of articles) {
    const key = article.primaryCategory?.slug?.current;
    if (!key) continue;
    const bucket = byCategory.get(key) ?? [];
    bucket.push(article);
    byCategory.set(key, bucket);
  }

  const childrenOf = new Map<string, Category[]>();
  for (const sub of subCategories) {
    const parentSlug = sub.parentCategory!.slug.current;
    const bucket = childrenOf.get(parentSlug) ?? [];
    bucket.push(sub);
    childrenOf.set(parentSlug, bucket);
  }

  const lines: string[] = [];

  lines.push(`# Ncheta Magazine — Full Content Index`);
  lines.push(``);
  lines.push(
    `> Ncheta (Igbo: "remember") is an independent African art and culture publication documenting West African artistic narratives.`
  );
  lines.push(``);
  lines.push(`Site: ${SITE}`);
  lines.push(`Concise index: ${SITE}/llms.txt`);
  lines.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`Total articles: ${articles.length}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Static pages
  lines.push(`## Static Pages`);
  lines.push(``);

  const staticPages = [
    {
      title: "About Ncheta",
      url: `${SITE}/about`,
      desc: `Ncheta Magazine is an independent publication dedicated to documenting and preserving West African art narratives. The name "Ncheta" means "remember" in Igbo, reflecting a mission to create an authoritative record of African artistic expression. The magazine serves artists, academics, curators, gallerists, and collectors across the African continent and diaspora.`,
    },
    {
      title: "Services",
      url: `${SITE}/services`,
      desc: `Ncheta offers editorial partnerships, long-form art criticism, cultural consulting, writing commissions, exhibition reviews, artist profiles, institutional content strategy, and media production services.`,
    },
    {
      title: "Contact",
      url: `${SITE}/contact`,
      desc: `Editorial enquiries, contributor pitches, partnership proposals, and general correspondence with the Ncheta Magazine editorial team.`,
    },
    {
      title: "Search",
      url: `${SITE}/search`,
      desc: `Full-text search across all Ncheta articles, sortable by relevance, newest, or oldest.`,
    },
  ];

  for (const page of staticPages) {
    lines.push(`### [${page.title}](${page.url})`);
    lines.push(``);
    lines.push(page.desc);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Magazine Articles`);
  lines.push(``);

  const renderArticles = (articleList: Article[]) => {
    for (const article of articleList) {
      const date = formatDate(article.publishedAt);
      const author = article.author?.name ?? "Ncheta Magazine";
      const authorRole = article.author?.title ? `, ${article.author.title}` : "";
      const tags =
        article.metaCategories && article.metaCategories.length > 0
          ? `Tags: ${article.metaCategories.map((t) => t.name).join(", ")}`
          : "";

      lines.push(`### [${article.title}](${articleUrl(article)})`);
      lines.push(``);
      lines.push(`**Author:** ${author}${authorRole}  `);
      if (date) lines.push(`**Published:** ${date}  `);
      if (tags) lines.push(`**${tags}**  `);
      lines.push(``);
      if (article.excerpt) {
        lines.push(article.excerpt);
        lines.push(``);
      }
    }
  };

  for (const cat of topLevel) {
    const catSlug = cat.slug?.current;
    if (!catSlug) continue;

    lines.push(`## [${cat.name}](${SITE}/magazine/${catSlug})`);
    lines.push(``);
    if (cat.description) {
      lines.push(cat.description);
      lines.push(``);
    }

    const direct = byCategory.get(catSlug) ?? [];
    renderArticles(direct);

    const children = childrenOf.get(catSlug) ?? [];
    for (const child of children) {
      const childSlug = child.slug?.current;
      if (!childSlug) continue;
      const childArticles = byCategory.get(childSlug) ?? [];
      if (childArticles.length === 0) continue;

      lines.push(`### Subcategory: [${child.name}](${SITE}/magazine/${childSlug})`);
      lines.push(``);
      if (child.description) {
        lines.push(child.description);
        lines.push(``);
      }
      renderArticles(childArticles);
    }
  }

  // Orphaned subcategories
  const coveredParents = new Set(topLevel.map((c) => c.slug?.current));
  for (const sub of subCategories) {
    const parentSlug = sub.parentCategory!.slug.current;
    if (coveredParents.has(parentSlug)) continue;
    const subSlug = sub.slug?.current;
    if (!subSlug) continue;
    const subArticles = byCategory.get(subSlug) ?? [];
    if (subArticles.length === 0) continue;

    lines.push(`## [${sub.name}](${SITE}/magazine/${subSlug})`);
    lines.push(``);
    renderArticles(subArticles);
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
