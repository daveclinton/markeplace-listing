export interface ProductSearchResponse {
  products: Array<{
    id: string;
    title: string;
    description: string;
    images: string[];
    rating?: number;
    numReviews?: number;
    numOffers?: number;
    pageUrl?: string;
    priceRange?: string[];
  }>;
  total: number;
  page: number;
  limit: number;
}
