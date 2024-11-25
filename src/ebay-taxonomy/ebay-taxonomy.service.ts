import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MarketplaceConnectionStatusEnums } from 'src/marketplaces/marketplace-connection-status.enum';
import { MarketplaceConfigService } from 'src/marketplaces/marketplaces.config';
import { OAuthTokenRefreshService } from 'src/marketplaces/oauth-token-refresh.service';
import { UserMarketplaceLink } from 'src/marketplaces/user.marketplace-link.entity';
import { Repository } from 'typeorm';
import { Logger } from 'winston';

export interface EbayListingPayload {
  title?: string;
  description?: string;
  category?: string;
  condition?: {
    condition?: string;
    conditionDescription?: string;
  };
  price?: {
    value?: number;
    currency?: string;
  };
  sku?: string;
  pictures?: string[];
  specifics?: Record<string, any>;
  shipping?: {
    service?: string;
    cost?: number;
    international?: {
      countryOfOrigin?: string;
      customsInfo?: string;
      restrictions?: string[];
    };
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    };
    weight?: {
      value?: number;
      unit?: string;
    };
  };
  availability?: {
    quantity?: number;
  };
  product?: {
    aspects?: Record<string, string[]>;
    mpn?: string;
    brand?: string;
    upc?: string;
    ean?: string;
  };
  payment?: {
    methods?: string[];
    terms?: string;
    taxCategory?: string;
  };
  listing?: {
    type?: 'FixedPrice' | 'Auction';
    duration?: string;
    location?: string;
    sellerType?: 'Business' | 'Individual';
  };
  compliance?: {
    imageUrlValidation?: boolean;
    characterLimits?: {
      titleMax?: number;
      descriptionMax?: number;
    };
  };
}

@Injectable()
export class EbayTaxonomyService {
  private static EBAY_LISTING_PAYLOAD: EbayListingPayload = {
    title: 'Premium Wireless Noise-Cancelling Headphones',
    description:
      'Experience superior sound quality with our advanced noise-cancelling technology. Comfortable over-ear design with up to 30 hours of battery life.',
    category: '171835',
    condition: {
      condition: 'New',
      conditionDescription:
        'Unopened, factory sealed with full manufacturer warranty',
    },
    price: {
      value: 249.99,
      currency: 'USD',
    },
    sku: '',
    pictures: [
      'https://example.com/headphones-front.jpg',
      'https://example.com/headphones-side.jpg',
    ],
    specifics: {
      color: 'Black',
      bluetooth: true,
      wirelessRange: 10,
    },
    shipping: {
      service: 'Standard Shipping',
      cost: 15.99,
      international: {
        countryOfOrigin: 'United States',
        customsInfo: 'Consumer electronics, no special import restrictions',
        restrictions: ['Battery limitations may apply'],
      },
      dimensions: {
        length: 20,
        width: 15,
        height: 8,
        unit: 'cm',
      },
      weight: {
        value: 0.5,
        unit: 'kg',
      },
    },
    availability: {
      quantity: 50,
    },
    product: {
      aspects: {
        Color: ['Black'],
        Connectivity: ['Wireless'],
        'Headphone Type': ['Over Ear'],
      },
      mpn: 'NC-500-BLK',
      brand: 'TechSound',
      upc: '123456789012',
      ean: '1234567890123',
    },
    payment: {
      methods: ['PayPal', 'Credit Card', 'Apple Pay'],
      terms: 'Full payment required at time of purchase',
      taxCategory: 'Electronics',
    },
    listing: {
      type: 'FixedPrice',
      duration: 'GTC',
      location: 'New York, NY',
      sellerType: 'Business',
    },
    compliance: {
      imageUrlValidation: true,
      characterLimits: {
        titleMax: 80,
        descriptionMax: 4000,
      },
    },
  };

  constructor(
    @InjectRepository(UserMarketplaceLink)
    private readonly userMarketplaceLinkRepo: Repository<UserMarketplaceLink>,
    private readonly marketplaceConfigService: MarketplaceConfigService,
    private readonly oauthTokenRefreshService: OAuthTokenRefreshService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async uploadListing(userSupabaseId: string): Promise<any> {
    try {
      this.validateListing(EbayTaxonomyService.EBAY_LISTING_PAYLOAD);

      await this.oauthTokenRefreshService.refreshTokenIfNeeded(
        userSupabaseId,
        'ebay',
      );

      const link = await this.getUserMarketplaceLink(userSupabaseId);

      const response = await fetch(
        'https://api.ebay.com/sell/inventory/v1/inventory_item',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${link.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
          body: JSON.stringify({
            sku: this.generateUniqueSKU(),
            product: {
              ...EbayTaxonomyService.EBAY_LISTING_PAYLOAD.product,
              title: EbayTaxonomyService.EBAY_LISTING_PAYLOAD.title,
              description: EbayTaxonomyService.EBAY_LISTING_PAYLOAD.description,
            },
            availability: EbayTaxonomyService.EBAY_LISTING_PAYLOAD.availability,
            pricing: {
              price: EbayTaxonomyService.EBAY_LISTING_PAYLOAD.price,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`eBay API Error: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Listing upload failed:', error);
      throw error;
    }
  }

  private validateListing(payload: EbayListingPayload): void {
    if (payload.title.length > payload.compliance.characterLimits.titleMax) {
      throw new Error('Title exceeds maximum character limit');
    }
    if (
      payload.description.length >
      payload.compliance.characterLimits.descriptionMax
    ) {
      throw new Error('Description exceeds maximum character limit');
    }
  }

  private generateUniqueSKU(): string {
    return `ITEM-${EbayTaxonomyService.EBAY_LISTING_PAYLOAD.product.mpn}-${Date.now()}`;
  }

  updateListingPayload(updates: Partial<EbayListingPayload>): void {
    Object.assign(EbayTaxonomyService.EBAY_LISTING_PAYLOAD, updates);
  }

  private async getUserMarketplaceLink(
    userSupabaseId: string,
  ): Promise<UserMarketplaceLink> {
    const ebayConfig =
      this.marketplaceConfigService.getMarketplaceConfig('ebay');

    if (!ebayConfig) {
      throw new Error('eBay marketplace configuration not found');
    }

    const link = await this.userMarketplaceLinkRepo.findOne({
      where: {
        userSupabaseId,
        marketplaceId: ebayConfig.id,
        connectionStatus: MarketplaceConnectionStatusEnums.ACTIVE,
      },
    });

    if (!link) {
      throw new Error(
        'No active eBay marketplace connection found for this user',
      );
    }

    return link;
  }
}
