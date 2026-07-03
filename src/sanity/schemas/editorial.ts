// Editorial schema — main article document with references, blocks, and media
export const editorialSchema = {
  name: "editorial",
  type: "document",
  title: "Magazine Articles",
  fields: [
    {
      name: "title",
      type: "string",
      title: "Title",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "slug",
      type: "slug",
      title: "Slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "primaryCategory",
      type: "reference",
      title: "Primary Category",
      to: [{ type: "category" }],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "metaCategories",
      type: "array",
      title: "Additional Categories / Tags",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    },
    {
      name: "featuredImage",
      type: "image",
      title: "Featured Image",
      options: { hotspot: true },
    },
    {
      name: "excerpt",
      type: "text",
      title: "Excerpt",
      description: "Short summary for card previews and SEO",
    },
    {
      name: "content",
      type: "array",
      title: "Body Content",
      of: [{ type: "block" }, { type: "image" }],
    },
    {
      name: "youtubeVideoUrl",
      type: "url",
      title: "YouTube Video URL",
      description: "Off-site YouTube embed link",
    },
    {
      name: "transistorEpisodeGuid",
      type: "string",
      title: "Transistor Episode GUID",
      description: "Transistor.fm external asset key ID",
    },
    {
      name: "publishedAt",
      type: "datetime",
      title: "Published At",
      initialValue: () => new Date().toISOString(),
    },
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "primaryCategory.name",
      media: "featuredImage",
    },
  },
};