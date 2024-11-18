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
export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: string;
  created_at: string;
  asset_id: string;
}

export interface ImageSearchDto {
  imageUrl?: string;
  imageFile?: Express.Multer.File;
}

interface SearchMetadata {
  id: string;
  status: string;
  json_endpoint: string;
  created_at: string;
  processed_at: string;
  google_reverse_image_url: string;
  raw_html_file: string;
  total_time_taken: number;
}

interface SearchParameters {
  engine: string;
  image_url: string;
  google_domain: string;
  device: string;
}

interface SearchInformation {
  organic_results_state: string;
  query_displayed: string;
  total_results: number;
  time_taken_displayed: number;
}

interface ImageSize {
  title: string;
  link: string;
  serpapi_link: string;
}

interface ImageResult {
  position: number;
  title: string;
  link: string;
  redirect_link: string;
  displayed_link: string;
  favicon?: string;
  snippet?: string;
  snippet_highlighted_words?: string[];
  source: string;
  thumbnail?: string;
  date?: string;
}

export interface GoogleReverseImageSearchResponse {
  search_metadata: SearchMetadata;
  search_parameters: SearchParameters;
  search_information: SearchInformation;
  image_sizes: ImageSize[];
  image_results: ImageResult[];
}
