// marketplaces.config.ts
import { ConfigService } from '@nestjs/config';

export interface MarketplaceConfig {
  id: number;
  name: string;
  slug: string;
  icon_url: string;
  oauth_url: string;
  token_url: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
  is_supported: boolean;
  is_linked: boolean;
}

export const createSupportedMarketplaces = (
  configService: ConfigService,
): MarketplaceConfig[] => [
  {
    id: 1,
    name: 'eBay',
    slug: 'ebay',
    icon_url:
      'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/042013/ebay_logo.png?itok=QLz1bS2p',
    oauth_url: 'https://auth.ebay.com/oauth2/authorize',
    token_url: 'https://api.ebay.com/identity/v1/oauth2/token',
    client_id: configService.get<string>('EBAY_CLIENT_ID'),
    client_secret: configService.get<string>('EBAY_CLIENT_SECRET'),
    redirect_uri: `${configService.get<string>('APP_URL')}/api/marketplace/callback/ebay`,
    scope: 'https://api.ebay.com/oauth/api_scope',
    is_supported: true,
    is_linked: false,
  },
  {
    id: 2,
    name: 'Facebook',
    slug: 'facebook',
    icon_url:
      'https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Facebook2_colored_svg-1024.png',
    oauth_url: 'https://www.facebook.com/v12.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v12.0/oauth/access_token',
    client_id: configService.get<string>('FACEBOOK_CLIENT_ID'),
    client_secret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
    redirect_uri: `${configService.get<string>('APP_URL')}/api/marketplace/callback/facebook`,
    scope: 'marketplace_management',
    is_supported: true,
    is_linked: false,
  },
];
