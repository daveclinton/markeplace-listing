import { ConfigService } from '@nestjs/config';
import eBayApi from 'ebay-api';

export const eBayConfigFactory = (configService: ConfigService) => {
  const marketplaceIdMap = {
    EBAY_US: eBayApi.MarketplaceId.EBAY_US,
  };

  return new eBayApi({
    appId: configService.get<string>('EBAY_APP_ID'),
    certId: configService.get<string>('EBAY_CERT_ID'),
    ruName: configService.get<string>('EBAY_RU_NAME'),
    sandbox: configService.get<boolean>('EBAY_SANDBOX'),
    marketplaceId:
      marketplaceIdMap[
        configService.get<string>('EBAY_MARKETPLACE_ID', 'EBAY_US')
      ],
  });
};
