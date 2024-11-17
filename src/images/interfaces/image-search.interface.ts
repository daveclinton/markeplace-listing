interface GoogleShoppingProduct {
  product_id: string;
  product_title: string;
  product_description: string;
  product_photos: string[];
  product_attributes: {
    product_rating: number;
    product_page_url: string;
    product_offers_page_url: string;
    product_specs_page_url: string;
    product_reviews_page_url: string;
    product_num_reviews: number;
    product_num_offers: string;
  };
  typical_price_range: string[];
  offer: any;
}

export interface GoogleShoppingResponse {
  status: string;
  request_id: string;
  data: {
    products: GoogleShoppingProduct[];
  };
}
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
