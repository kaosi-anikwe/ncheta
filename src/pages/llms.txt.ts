import type { APIRoute } from "astro";
import { getAllCategories, getAllEditorials } from "../sanity/queries";
import type { Category, Article } from "../sanity/types";

const SITE = "https://nchetamagazine.com";

function articleUrl(article: Article): string {
  const cat = article.primaryCategory?.slug?.current ?? "";
  const slug = article.slug?.current ?? "";
  return `${SITE}/magazine/${cat}/${slug}`;
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

  // Separate top-level categories from subcategories
  const topLevel = categories.filter((c) => !c.parentCategory);
  const subCategories = categories.filter((c) => !!c.parentCategory);

  // Index articles by their primaryCategory slug
  const byCategory = new Map<string, Article[]>();
  for (const article of articles) {
    const key = article.primaryCategory?.slug?.current;
    if (!key) continue;
    const bucket = byCategory.get(key) ?? [];
    bucket.push(article);
    byCategory.set(key, bucket);
  }

  // Index subcategories by parent slug
  const childrenOf = new Map<string, Category[]>();
  for (const sub of subCategories) {
    const parentSlug = sub.parentCategory!.slug.current;
    const bucket = childrenOf.get(parentSlug) ?? [];
    bucket.push(sub);
    childrenOf.set(parentSlug, bucket);
  }

  const lines: string[] = [];

  lines.push(`# Ncheta Magazine`);
  lines.push(``);
  lines.push(
    `> Ncheta (Igbo: "remember") is an independent African art and culture publication documenting West African artistic narratives for artists, academics, curators, gallerists, and collectors.`
  );
  lines.push(``);
  lines.push(
    `Ncheta Magazine publishes editorial content on contemporary and traditional African art, covering visual arts, literature, music, fashion, film, architecture, and cultural criticism.`
  );
  lines.push(``);

  lines.push(`## Site`);
  lines.push(``);
  lines.push(`- [About Ncheta](${SITE}/about): Mission, vision, and editorial approach`);
  lines.push(`- [Services](${SITE}/services): Editorial partnerships, art criticism, cultural consulting, writing commissions, and media services`);
  lines.push(`- [Contact](${SITE}/contact): Reach the editorial team`);
  lines.push(`- [Search](${SITE}/search): Full-text search across all published articles`);
  lines.push(``);

  lines.push(`## Magazine`);
  lines.push(``);

  for (const cat of topLevel) {
    const catSlug = cat.slug?.current;
    if (!catSlug) continue;

    lines.push(`### [${cat.name}](${SITE}/magazine/${catSlug})`);
    lines.push(``);

    const direct = byCategory.get(catSlug) ?? [];
    for (const article of direct) {
      const desc = article.excerpt ? `: ${article.excerpt}` : "";
      lines.push(`- [${article.title}](${articleUrl(article)})${desc}`);
    }

    const children = childrenOf.get(catSlug) ?? [];
    for (const child of children) {
      const childSlug = child.slug?.current;
      if (!childSlug) continue;
      const childArticles = byCategory.get(childSlug) ?? [];
      if (childArticles.length === 0) continue;

      lines.push(``);
      lines.push(`#### ${child.name}${child.description ? ` — ${child.description}` : ""}`);
      lines.push(``);
      for (const article of childArticles) {
        const desc = article.excerpt ? `: ${article.excerpt}` : "";
        lines.push(`- [${article.title}](${articleUrl(article)})${desc}`);
      }
    }

    lines.push(``);
  }

  // Orphan subcategories whose parent wasn't returned as a top-level doc
  const coveredParents = new Set(topLevel.map((c) => c.slug?.current));
  for (const sub of subCategories) {
    const parentSlug = sub.parentCategory!.slug.current;
    if (coveredParents.has(parentSlug)) continue;
    const subSlug = sub.slug?.current;
    if (!subSlug) continue;
    const subArticles = byCategory.get(subSlug) ?? [];
    if (subArticles.length === 0) continue;

    lines.push(`### [${sub.name}](${SITE}/magazine/${subSlug})`);
    lines.push(``);
    for (const article of subArticles) {
      const desc = article.excerpt ? `: ${article.excerpt}` : "";
      lines.push(`- [${article.title}](${articleUrl(article)})${desc}`);
    }
    lines.push(``);
  }

  lines.push(`## Legal`);
  lines.push(``);
  lines.push(`- [Copyright & Fair Use](${SITE}/copyright): Reproduction and fair use policy`);
  lines.push(`- [Site Policy](${SITE}/site-policy): Privacy policy and data practices`);
  lines.push(`- [Terms](${SITE}/terms): Terms of sale and refund policy`);
  lines.push(``);
  lines.push(`## Optional`);
  lines.push(``);
  lines.push(`- [Full content index](${SITE}/llms-full.txt): All articles with full excerpts`);

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
