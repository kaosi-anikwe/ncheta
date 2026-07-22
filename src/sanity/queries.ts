import { sanityClient } from "./client";
import type { Category, Article, NavigationSettings } from "./types";

// Fetch all categories with parent category and featured articles
export const getAllCategories = async (): Promise<Category[]> => {
  return sanityClient.fetch<Category[]>(
    `*[_type == "category"]{ 
      _id, 
      name, 
      slug, 
      description,
      parentCategory->{ _id, name, slug },
      featuredArticles[]->{ 
        _id, 
        title, 
        slug, 
        excerpt, 
        publishedAt, 
        featuredImage, 
        primaryCategory->{ name, slug },
        author->{ name, title } 
      }
    }`
  );
};

// Fetch navigation settings (single document) with category references and subItems expanded
export const getNavigationSettings = async (): Promise<NavigationSettings | null> => {
  return sanityClient.fetch<NavigationSettings | null>(`*[_type == "navigationSettings"][0]{
    maxHomepageCategories,
    maxArticlesPerCategory,
    menuItems[] {
      _type,
      _key,
      label,
      url,
      category->{ name, slug },
      subItems[] {
        _type,
        _key,
        label,
        url,
        category->{ name, slug }
      }
    }
  }`);
};

// Fetch editorial articles with category and author references expanded
export const getAllEditorials = async (): Promise<Article[]> => {
  return sanityClient.fetch<Article[]>(`*[_type == "editorial"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    featuredImage,
    primaryCategory->{ name, slug, parentCategory->{ name, slug } },
    metaCategories[]->{ name, slug },
    author->{ name, title, avatar }
  }`);
};

// Fetch a single editorial by slug with full content
export const getEditorialBySlug = async (slug: string): Promise<Article | null> => {
  return sanityClient.fetch<Article | null>(
    `*[_type == "editorial" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      featuredImage,
      content,
      youtubeVideoUrl,
      transistorEpisodeGuid,
      primaryCategory->{ name, slug, parentCategory->{ name, slug } },
      metaCategories[]->{ name, slug },
      author->{ name, title, avatar }
    }`,
    { slug }
  );
};

// Fetch editorials by category slug (including subcategories whose parent is categorySlug)
export const getEditorialsByCategory = async (categorySlug: string): Promise<Article[]> => {
  return sanityClient.fetch<Article[]>(
    `*[_type == "editorial" && (primaryCategory->slug.current == $categorySlug || primaryCategory->parentCategory->slug.current == $categorySlug)] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      featuredImage,
      primaryCategory->{ name, slug, parentCategory->{ name, slug } },
      metaCategories[]->{ name, slug },
      author->{ name, title, avatar }
    }`,
    { categorySlug }
  );
};