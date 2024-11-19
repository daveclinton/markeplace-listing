import { Module } from '@nestjs/common';
import { EbayTaxonomyService } from './ebay-taxonomy.service';

@Module({
  providers: [EbayTaxonomyService],
})
export class EbayTaxonomyModule {}
