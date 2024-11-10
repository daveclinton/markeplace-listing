export type MarketplaceSlug = 'ebay' | 'facebook';

export interface OAuthConfig {
  oauth_url: string;
  token_url: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
}

export interface MarketplaceConfig {
  id: number;
  name: string;
  slug: MarketplaceSlug;
  icon_url: string;
  is_supported: boolean;
  is_linked: boolean;
  oauth: OAuthConfig;
}
