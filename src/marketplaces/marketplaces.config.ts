import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { MarketplaceConfig, MarketplaceSlug } from './marketplace.types';

@Injectable()
export class MarketplaceConfigService {
  private readonly marketplaces: Map<MarketplaceSlug, MarketplaceConfig>;

  constructor(private readonly configService: ConfigService) {
    this.marketplaces = this.initializeMarketplaces();
  }

  private initializeMarketplaces(): Map<MarketplaceSlug, MarketplaceConfig> {
    const marketplaceMap = new Map<MarketplaceSlug, MarketplaceConfig>();

    const baseUrl = this.configService.get<string>('APP_URL');

    // eBay Configuration
    marketplaceMap.set('ebay', {
      id: 1,
      name: 'eBay',
      slug: 'ebay',
      icon_url:
        'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/042013/ebay_logo.png?itok=QLz1bS2p',
      is_supported: true,
      is_linked: false,
      oauth: {
        oauth_url: 'https://auth.sandbox.ebay.com/oauth2/authorize',
        token_url: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
        client_id: this.configService.getOrThrow<string>('EBAY_CLIENT_ID'),
        client_secret:
          this.configService.getOrThrow<string>('EBAY_CLIENT_SECRET'),
        redirect_uri: `${baseUrl}/api/marketplace/callback/ebay`,
        scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
      },
    });

    // Facebook Configuration
    // marketplaceMap.set('facebook', {
    //   id: 2,
    //   name: 'Facebook',
    //   slug: 'facebook',
    //   icon_url:
    //     'https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Facebook2_colored_svg-1024.png',
    //   is_supported: true,
    //   is_linked: false,
    //   oauth: {
    //     oauth_url: 'https://www.facebook.com/v12.0/dialog/oauth',
    //     token_url: 'https://graph.facebook.com/v12.0/oauth/access_token',
    //     client_id: this.configService.getOrThrow<string>('FACEBOOK_CLIENT_ID'),
    //     client_secret: this.configService.getOrThrow<string>(
    //       'FACEBOOK_CLIENT_SECRET',
    //     ),
    //     redirect_uri: `${baseUrl}/api/marketplace/callback/facebook`,
    //     scope: 'marketplace_management',
    //   },
    // });

    return marketplaceMap;
  }

  getMarketplaceConfig(slug: MarketplaceSlug): MarketplaceConfig | undefined {
    return this.marketplaces.get(slug);
  }

  getAllMarketplaces(): MarketplaceConfig[] {
    return Array.from(this.marketplaces.values());
  }

  getSupportedMarketplaces(): MarketplaceConfig[] {
    return this.getAllMarketplaces().filter((mp) => mp.is_supported);
  }

  isMarketplaceSupported(slug: MarketplaceSlug): boolean {
    const config = this.getMarketplaceConfig(slug);
    return config?.is_supported ?? false;
  }
}
