import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  Inject,
} from '@nestjs/common';
import {
  EbayTaxonomyService,
  EbayListingPayload,
} from './ebay-taxonomy.service';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@ApiTags('ebay')
@Controller('ebay/listings')
export class EbayTaxonomyController {
  constructor(
    private readonly ebayTaxonomyService: EbayTaxonomyService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  @ApiParam({
    name: 'userSupabaseId',
    description: 'Supabase user ID',
    type: String,
  })
  @Post()
  async createListing(
    @Body() listingData: EbayListingPayload,
    @Param('userSupabaseId') userSupabaseId: string,
  ) {
    this.ebayTaxonomyService.updateListingPayload(listingData);
    this.logger.info(`This Payload: ${JSON.stringify({ listingData })}`);

    return this.ebayTaxonomyService.uploadListing(userSupabaseId);
  }

  @Put()
  async updateListingPayload(@Body() updates: Partial<EbayListingPayload>) {
    this.ebayTaxonomyService.updateListingPayload(updates);
    return { message: 'Listing payload updated successfully' };
  }

  @Get('payload')
  getCurrentPayload() {
    // This would require modifying the service to expose the current payload
    // You might want to add a method in the service to return the current payload
    throw new Error(
      'Not implemented - add method to service to return current payload',
    );
  }

  @Delete('payload')
  resetPayloadToDefault() {
    // This would require a method in the service to reset to default
    throw new Error('Not implemented - add method to service to reset payload');
  }
}
