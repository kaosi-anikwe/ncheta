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
          name: "categoryLink",
          title: "Link to Category",
          fields: [
            {
              name: "category",
              type: "reference",
              title: "Category Reference",
              to: [{ type: "category" }],
              validation: (Rule: any) => Rule.required()
            },
            {
              name: "customLabel",
              type: "string",
              title: "Custom Label",
              description: "Optional override for the display name in the header menu"
            }
          ],
          preview: {
            select: {
              title: "category.name",
              customLabel: "customLabel"
            },
            prepare(selection: any) {
              const { title, customLabel } = selection;
              return {
                title: customLabel || title || "Unlinked Category",
                subtitle: "Category Reference Link"
              };
            }
          }
        },
        {
          type: "object",
          name: "customLink",
          title: "Custom URL Link",
          fields: [
            {
              name: "label",
              type: "string",
              title: "Display Label",
              validation: (Rule: any) => Rule.required()
            },
            {
              name: "url",
              type: "string",
              title: "URL Path / Address",
              description: "e.g. /about, /services, or https://google.com",
              validation: (Rule: any) => Rule.required()
            }
          ],
          preview: {
            select: {
              title: "label",
              subtitle: "url"
            }
          }
        }
      ]
    }
  ]
};