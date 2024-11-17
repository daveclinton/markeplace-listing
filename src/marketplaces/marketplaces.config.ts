import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceConfig, MarketplaceSlug } from './marketplace.types';

@Injectable()
export class MarketplaceConfigService {
  private readonly marketplaces: Map<MarketplaceSlug, MarketplaceConfig>;
  private readonly logger = new Logger(MarketplaceConfigService.name);

  constructor(private readonly configService: ConfigService) {
    this.marketplaces = this.initializeMarketplaces();
  }

  private initializeMarketplaces(): Map<MarketplaceSlug, MarketplaceConfig> {
    const marketplaceMap = new Map<MarketplaceSlug, MarketplaceConfig>();

    const baseUrl = this.configService.get<string>('APP_URL');

    this.logger.debug(`Base URL from config: ${baseUrl}`);

    marketplaceMap.set('ebay', {
      id: 1,
      name: 'eBay',
      slug: 'ebay',
      icon_url:
        'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/042013/ebay_logo.png?itok=QLz1bS2p',
      is_supported: true,
      is_linked: false,
      mobile_app: {
        scheme:
          'com.snaplist://feed/new-marketplace?marketplace=ebay&connection={connection}',
      },
      oauth: {
        oauth_url: 'https://auth.sandbox.ebay.com/oauth2/authorize',
        token_url: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
        client_id: 'DavidCli-snaplist-SBX-6fe1f119b-85d7ecad',
        client_secret: 'SBX-fe1f119bb54f-101f-4b99-b803-5068',
        redirect_uri: `${baseUrl}/api/v1/marketplaces/callback/ebay`,
        scope:
          'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.account',
        additional_params: {
          prompt: 'login',
          prompt_type: 'login',
        },
        web_redirect_url: 'https://your-frontend-url.com/auth/callback',
      },
    });
    marketplaceMap.set('facebook', {
      id: 2,
      name: 'Facebook',
      slug: 'facebook',
      icon_url:
        'https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Facebook2_colored_svg-1024.png',
      is_supported: true,
      is_linked: false,
      mobile_app: {
        scheme:
          'com.snaplist://feed/new-marketplace?marketplace=facebook&connection={connection}',
      },
      oauth: {
        oauth_url: 'https://www.facebook.com/v12.0/dialog/oauth',
        token_url: 'https://graph.facebook.com/v12.0/oauth/access_token',
        client_id: this.configService.getOrThrow<string>('FACEBOOK_CLIENT_ID'),
        client_secret: this.configService.getOrThrow<string>(
          'FACEBOOK_CLIENT_SECRET',
        ),
        redirect_uri: `${baseUrl}/api/v1/marketplaces/callback/facebook`,
        scope: 'catalog_management',
        web_redirect_url: '',
      },
    });

    this.logger.debug(
      `eBay redirect URI: ${marketplaceMap.get('ebay')?.oauth.redirect_uri}`,
    );
    this.logger.debug(
      `Facebook redirect URI: ${marketplaceMap.get('facebook')?.oauth.redirect_uri}`,
    );

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
