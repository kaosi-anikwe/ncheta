// Navigation settings — single-document schema limiting header to 8 primary links
export const navigationSettingsSchema = {
  name: "navigationSettings",
  type: "document",
  title: "Navigation Settings",
  fields: [
    {
      name: "menuItems",
      type: "array",
      title: "Header Menu Items",
      description: "Maximum 8 primary navigation links",
      validation: (Rule: any) =>
        Rule.required().max(8).error("Header is limited to 8 primary links"),
      of: [
        {
          type: "object",
          fields: [
            { name: "label", type: "string", title: "Label", validation: (Rule: any) => Rule.required() },
            { name: "href", type: "string", title: "URL", validation: (Rule: any) => Rule.required() },
          ],
        },
      ],
    },
  ],
};