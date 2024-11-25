export interface IMarketplace {
  createListing(productId: string, userId: string): Promise<any>;
  updateListing(listingId: string, userId: string): Promise<any>;
  endListing(listingId: string, userId: string): Promise<any>;
}
