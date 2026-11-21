export const bookSchema = {
  name: 'book',
  type: 'document',
  title: 'Books (Store)',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'URL Slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'author',
      type: 'reference',
      title: 'Author',
      to: [{ type: 'author' }],
    },
    {
      name: 'coverImage',
      type: 'image',
      title: 'Cover Image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
        },
      ],
    },
    {
      name: 'excerpt',
      type: 'text',
      title: 'Short Description',
      description: 'Displayed on store listing cards',
      rows: 3,
    },
    {
      name: 'description',
      type: 'array',
      title: 'Full Description',
      of: [{ type: 'block' }],
    },
    {
      name: 'isbn',
      type: 'string',
      title: 'ISBN',
    },
    {
      name: 'publishedYear',
      type: 'number',
      title: 'Publication Year',
    },
    {
      name: 'pageCount',
      type: 'number',
      title: 'Page Count',
    },
    {
      name: 'publisher',
      type: 'string',
      title: 'Publisher',
    },
    {
      name: 'formats',
      type: 'array',
      title: 'Available Formats',
      description: 'Add one entry per format (PDF, EPUB, Physical)',
      validation: (Rule: any) => Rule.min(1),
      of: [
        {
          type: 'object',
          name: 'bookFormat',
          title: 'Format',
          fields: [
            {
              name: 'format',
              type: 'string',
              title: 'Format',
              options: {
                list: [
                  { title: 'Digital — PDF', value: 'pdf' },
                  { title: 'Digital — EPUB', value: 'epub' },
                  { title: 'Physical', value: 'physical' },
                ],
                layout: 'radio',
              },
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'prices',
              type: 'array',
              title: 'Prices',
              description: 'Add one entry per currency',
              validation: (Rule: any) => Rule.min(1),
              of: [
                {
                  type: 'object',
                  name: 'price',
                  fields: [
                    {
                      name: 'currency',
                      type: 'string',
                      title: 'Currency',
                      options: { list: ['NGN', 'USD'] },
                      validation: (Rule: any) => Rule.required(),
                    },
                    {
                      name: 'amount',
                      type: 'number',
                      title: 'Amount (smallest unit — kobo for NGN, cents for USD)',
                      description: 'e.g. 250000 for ₦2,500 or 1500 for $15.00',
                      validation: (Rule: any) => Rule.required().min(0),
                    },
                  ],
                  preview: {
                    select: { title: 'currency', subtitle: 'amount' },
                    prepare({ title, subtitle }: any) {
                      return { title, subtitle: subtitle != null ? String(subtitle) : '' };
                    },
                  },
                },
              ],
            },
            // Digital-only
            {
              name: 'r2Key',
              type: 'string',
              title: 'R2 Object Key',
              description: 'Set automatically when file is uploaded via admin panel. e.g. books/my-book/book.pdf',
              readOnly: true,
            },
            // Physical-only
            {
              name: 'weightKg',
              type: 'number',
              title: 'Weight (kg)',
              description: 'Required for DHL shipping quotes',
            },
            {
              name: 'dimensionsCm',
              type: 'object',
              title: 'Package Dimensions (cm)',
              description: 'Required for DHL shipping quotes',
              fields: [
                { name: 'length', type: 'number', title: 'Length (cm)' },
                { name: 'width', type: 'number', title: 'Width (cm)' },
                { name: 'height', type: 'number', title: 'Height (cm)' },
              ],
            },
          ],
          preview: {
            select: { format: 'format' },
            prepare({ format }: any) {
              const labels: Record<string, string> = { pdf: 'Digital — PDF', epub: 'Digital — EPUB', physical: 'Physical' };
              return { title: labels[format] ?? format };
            },
          },
        },
      ],
    },
    {
      name: 'featured',
      type: 'boolean',
      title: 'Featured on store homepage',
      initialValue: false,
    },
    {
      name: 'relatedArticles',
      type: 'array',
      title: 'Related Magazine Articles',
      of: [{ type: 'reference', to: [{ type: 'editorial' }] }],
    },
  ],
  preview: {
    select: { title: 'title', media: 'coverImage', subtitle: 'excerpt' },
  },
};
