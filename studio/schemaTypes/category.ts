// Category schema — structural layout for editorial pillars
export const categorySchema = {
  name: "category",
  type: "document",
  title: "Category",
  fields: [
    {
      name: "name",
      type: "string",
      title: "Category Name",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "slug",
      type: "slug",
      title: "Slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "description",
      type: "text",
      title: "Description",
    },
    {
      name: "parentCategory",
      type: "reference",
      title: "Parent Category",
      description: "Optional parent category for subcategories (e.g. Auctions under Art News)",
      to: [{ type: "category" }],
    },
    {
      name: "featuredArticles",
      type: "array",
      title: "Featured Articles (Homepage)",
      description: "Select and order specific articles to feature for this category on the homepage",
      of: [{ type: "reference", to: [{ type: "editorial" }] }],
    },
  ],
};