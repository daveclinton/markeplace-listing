import { MarketplaceConnectionStatusEnums } from './marketplace-connection-status.enum';

export type MarketplaceSlug = 'ebay' | 'facebook' | string;

export interface OAuthConfig {
  oauth_url: string;
  token_url: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
  additional_params?: {
    SignIn?: string;
    AppName?: string;
    ru?: string;
    [key: string]: string | undefined;
  };
  web_redirect_url: string;
}

export interface MobileAppConfig {
  scheme: string;
}

export interface MarketplaceConfig {
  id: number;
  name: string;
  slug: MarketplaceSlug;
  icon_url: string;
  is_supported: boolean;
  is_linked: boolean;
  mobile_app: MobileAppConfig;
  oauth: OAuthConfig;
}

export interface MarketplaceConfigWithOAuth extends MarketplaceConfig {
  is_linked: boolean;
  oauth_url?: string;
}

export interface MarketplaceStatus {
  marketplace: MarketplaceConfig;
  connectionStatus: MarketplaceConnectionStatusEnums;
  lastSyncAt?: Date;
  errorMessage?: string;
  oauth_url?: string;
}
