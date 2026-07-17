import { sanityClient } from "./client";

// Fetch all categories
export const getAllCategories = async () => {
  return sanityClient.fetch(`*[_type == "category"]{ _id, name, slug, description }`);
};

// Fetch navigation settings (single document)
export const getNavigationSettings = async () => {
  return sanityClient.fetch(`*[_type == "navigationSettings"][0]{ menuItems }`);
};

// Fetch editorial articles with category and author references expanded
export const getAllEditorials = async () => {
  return sanityClient.fetch(`*[_type == "editorial"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    featuredImage,
    primaryCategory->{ name, slug },
    metaCategories[]->{ name, slug },
    author->{ name, title, avatar }
  }`);
};

// Fetch a single editorial by slug with full content
export const getEditorialBySlug = async (slug: string) => {
  return sanityClient.fetch(
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
      primaryCategory->{ name, slug },
      metaCategories[]->{ name, slug },
      author->{ name, title, avatar }
    }`,
    { slug }
  );
};

// Fetch editorials by category slug
export const getEditorialsByCategory = async (categorySlug: string) => {
  return sanityClient.fetch(
    `*[_type == "editorial" && primaryCategory->slug.current == $categorySlug] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      featuredImage,
      primaryCategory->{ name, slug },
      metaCategories[]->{ name, slug },
      author->{ name, title, avatar }
    }`,
    { categorySlug }
  );
};