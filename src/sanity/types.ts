export interface Category {
  _id: string;
  name: string;
  slug: {
    current: string;
  };
  description?: string;
  parentCategory?: {
    _id: string;
    name: string;
    slug: {
      current: string;
    };
  };
  featuredArticles?: Article[];
}

export interface Author {
  _id: string;
  name: string;
  title?: string;
  avatar?: any;
}

export interface Article {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  excerpt?: string;
  publishedAt?: string;
  featuredImage?: any;
  content?: any[];
  youtubeVideoUrl?: string;
  transistorEpisodeGuid?: string;
  primaryCategory?: {
    name: string;
    slug: {
      current: string;
    };
    parentCategory?: {
      name: string;
      slug: {
        current: string;
      };
    };
  };
  metaCategories?: Array<{
    name: string;
    slug: {
      current: string;
    };
  }>;
  author?: Author;
}

// ── Store types ──────────────────────────────────────────────────────────────

export interface BookPrice {
  currency: 'NGN' | 'USD';
  amount: number;
}

export interface BookFormat {
  _key: string;
  format: 'pdf' | 'epub' | 'physical';
  prices: BookPrice[];
  r2Key?: string;
  weightKg?: number;
  dimensionsCm?: { length: number; width: number; height: number };
}

export interface Book {
  _id: string;
  title: string;
  slug: { current: string };
  author?: Author;
  coverImage?: any;
  excerpt?: string;
  description?: any[];
  isbn?: string;
  publishedYear?: number;
  pageCount?: number;
  publisher?: string;
  formats: BookFormat[];
  featured?: boolean;
  relatedArticles?: Article[];
}

export interface StoreSettings {
  storeOpen: boolean;
  defaultCurrency: 'NGN' | 'USD';
  taxRatePercent: number;
  lowStockThreshold: number;
  dhlBufferDays: number;
  dhlOriginName: string;
  dhlOriginCompany: string;
  dhlOriginAddressLine1: string;
  dhlOriginAddressLine2?: string;
  dhlOriginCity: string;
  dhlOriginPostalCode: string;
  dhlOriginCountryCode: string;
  downloadTokenExpiryHours: number;
  maxDownloadsPerToken: number;
  storeEmailFrom: string;
  poNotificationEmail: string;
  storeIntroText?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface NavigationItem {
  _type: string;
  _key: string;
  label?: string;
  url?: string;
  category?: {
    name: string;
    slug: {
      current: string;
    };
  };
  customLabel?: string;
  subItems?: NavigationItem[];
}

export interface NavigationSettings {
  maxHomepageCategories?: number;
  maxArticlesPerCategory?: number;
  menuItems?: NavigationItem[];
}
