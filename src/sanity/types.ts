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
