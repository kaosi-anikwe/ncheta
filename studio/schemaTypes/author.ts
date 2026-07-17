export const authorSchema = {
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    {
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "title",
      title: "Title / Role",
      type: "string",
      description: "e.g. Senior Editor, Guest Contributor, Curator",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "avatar",
      title: "Avatar",
      type: "image",
      options: { hotspot: true },
    },
    {
      name: "bio",
      title: "Biography",
      type: "text",
      rows: 4,
    },
  ],
};
