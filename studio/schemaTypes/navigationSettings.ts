export const navigationSettingsSchema = {
  name: "navigationSettings",
  type: "document",
  title: "Navigation Settings",
  fields: [
    {
      name: "maxHomepageCategories",
      type: "number",
      title: "Max Homepage Categories",
      description: "Maximum number of category sections shown on homepage (default: 5)",
      initialValue: 5,
      validation: (Rule: any) => Rule.min(1).max(20),
    },
    {
      name: "maxArticlesPerCategory",
      type: "number",
      title: "Max Articles Per Category on Homepage",
      description: "Maximum total articles shown per category section on homepage (default: 9)",
      initialValue: 9,
      validation: (Rule: any) => Rule.min(1).max(30),
    },
    {
      name: "menuItems",
      type: "array",
      title: "Header Menu Items",
      description: "Maximum 8 primary navigation links with optional subcategories",
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
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: "customLabel",
              type: "string",
              title: "Custom Label",
              description: "Optional override for the display name in the header menu",
            },
            {
              name: "subItems",
              type: "array",
              title: "Submenu Items / Subcategories",
              description: "Nested subcategory or links shown in dropdown menu",
              of: [
                {
                  type: "object",
                  name: "subCategoryLink",
                  title: "Subcategory Link",
                  fields: [
                    {
                      name: "category",
                      type: "reference",
                      title: "Category Reference",
                      to: [{ type: "category" }],
                      validation: (Rule: any) => Rule.required(),
                    },
                    {
                      name: "customLabel",
                      type: "string",
                      title: "Custom Label",
                    },
                  ],
                  preview: {
                    select: {
                      title: "category.name",
                      customLabel: "customLabel",
                    },
                    prepare(selection: any) {
                      const { title, customLabel } = selection;
                      return {
                        title: customLabel || title || "Unlinked Subcategory",
                        subtitle: "Subcategory Link",
                      };
                    },
                  },
                },
                {
                  type: "object",
                  name: "subCustomLink",
                  title: "Custom Link",
                  fields: [
                    {
                      name: "label",
                      type: "string",
                      title: "Display Label",
                      validation: (Rule: any) => Rule.required(),
                    },
                    {
                      name: "url",
                      type: "string",
                      title: "URL Path / Address",
                      validation: (Rule: any) => Rule.required(),
                    },
                  ],
                  preview: {
                    select: {
                      title: "label",
                      subtitle: "url",
                    },
                  },
                },
              ],
            },
          ],
          preview: {
            select: {
              title: "category.name",
              customLabel: "customLabel",
            },
            prepare(selection: any) {
              const { title, customLabel } = selection;
              return {
                title: customLabel || title || "Unlinked Category",
                subtitle: "Category Reference Link",
              };
            },
          },
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
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: "url",
              type: "string",
              title: "URL Path / Address",
              description: "e.g. /about, /services, or https://google.com",
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: "subItems",
              type: "array",
              title: "Submenu Items",
              of: [
                {
                  type: "object",
                  name: "subCategoryLink",
                  title: "Subcategory Link",
                  fields: [
                    {
                      name: "category",
                      type: "reference",
                      title: "Category Reference",
                      to: [{ type: "category" }],
                      validation: (Rule: any) => Rule.required(),
                    },
                    {
                      name: "customLabel",
                      type: "string",
                      title: "Custom Label",
                    },
                  ],
                },
                {
                  type: "object",
                  name: "subCustomLink",
                  title: "Custom Link",
                  fields: [
                    {
                      name: "label",
                      type: "string",
                      title: "Display Label",
                      validation: (Rule: any) => Rule.required(),
                    },
                    {
                      name: "url",
                      type: "string",
                      title: "URL Path / Address",
                      validation: (Rule: any) => Rule.required(),
                    },
                  ],
                },
              ],
            },
          ],
          preview: {
            select: {
              title: "label",
              subtitle: "url",
            },
          },
        },
      ],
    },
  ],
};