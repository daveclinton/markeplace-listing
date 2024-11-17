export interface ProductSearchQueryDto {
  query: string;
  limit?: number;
  page?: number;
  country?: string;
  language?: string;
}
