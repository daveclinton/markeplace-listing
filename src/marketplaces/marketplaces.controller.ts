import {
  Controller,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  BadRequestException,
  Logger,
  Res,
  NotFoundException,
  Patch,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { MarketplacesService } from './marketplaces.service';
import { MarketplaceConfigService } from './marketplaces.config';
import { UpdateMarketplaceStatusDto } from './dto/marketplace.dto';
import { MarketplaceSlug, MarketplaceResponse } from './marketplace.types';
import { MarketplaceConnectionStatusEnums } from './marketplace-connection-status.enum';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@ApiTags('marketplaces')
@Controller('marketplaces')
@ApiBearerAuth()
export class MarketplacesController {
  constructor(
    private readonly marketplacesService: MarketplacesService,
    private readonly marketplaceConfig: MarketplaceConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.logger.log('MarketplacesController initialized');
  }

  @Get(':userSupabaseId')
  @ApiOperation({
    summary: 'Get user marketplaces with their connection status',
  })
  @ApiParam({
    name: 'userSupabaseId',
    description: 'Supabase user ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of user marketplaces with their status',
  })
  async getMarketplacesForUser(
    @Param('userSupabaseId') userSupabaseId: string,
  ): Promise<MarketplaceResponse[]> {
    this.logger.log(`Getting marketplaces for user: ${userSupabaseId}`);
    try {
      const marketplaces =
        await this.marketplacesService.getMarketplacesForUser(userSupabaseId);
      this.logger.debug(
        `Retrieved ${marketplaces.length} marketplaces for user ${userSupabaseId}`,
      );
      return marketplaces;
    } catch (error) {
      this.logger.error(
        `Error fetching marketplaces for user ${userSupabaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Patch(':userSupabaseId/marketplace/:marketplaceId/status')
  @ApiOperation({ summary: 'Update marketplace connection status' })
  @ApiParam({
    name: 'userSupabaseId',
    description: 'Supabase user ID',
    type: String,
  })
  @ApiParam({
    name: 'marketplaceId',
    description: 'Marketplace ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Marketplace status updated successfully',
  })
  async updateMarketplaceStatus(
    @Param('userSupabaseId') userSupabaseId: string,
    @Param('marketplaceId') marketplaceId: number,
    @Body() updateDto: UpdateMarketplaceStatusDto,
  ): Promise<{ status: number; message: string }> {
    this.logger.log(
      `Updating marketplace ${marketplaceId} status to ${updateDto.status} for user ${userSupabaseId}`,
    );

    try {
      await this.marketplacesService.updateMarketplaceStatus(
        userSupabaseId,
        marketplaceId,
        updateDto.status,
        updateDto.errorMessage,
      );

      return {
        status: HttpStatus.OK,
        message: `Marketplace status updated to ${updateDto.status}`,
      };
    } catch (error) {
      this.logger.error(
        `Error updating marketplace status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('callback/:marketplace')
  @ApiOperation({ summary: 'Handle OAuth callback from marketplaces' })
  @ApiParam({
    name: 'marketplace',
    description: 'Marketplace slug',
    type: String,
  })
  async handleOAuthCallback(
    @Param('marketplace') marketplace: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Handling OAuth callback for marketplace: ${marketplace}`);
    this.logger.debug(`OAuth callback params - State: ${state}, Code: ${code}`);

    try {
      this.logger.debug(`Verifying marketplace ${marketplace} support`);
      if (
        !this.marketplaceConfig.isMarketplaceSupported(
          marketplace as MarketplaceSlug,
        )
      ) {
        this.logger.warn(`Unsupported marketplace in callback: ${marketplace}`);
        return this.redirectToMobileApp(
          res,
          marketplace,
          'error',
          'Unsupported marketplace',
          MarketplaceConnectionStatusEnums.NOT_SUPPORTED,
        );
      }

      const config = this.marketplaceConfig.getMarketplaceConfig(
        marketplace as MarketplaceSlug,
      );
      await this.marketplacesService.updateMarketplaceStatus(
        state,
        config.id,
        MarketplaceConnectionStatusEnums.PENDING,
      );

      await this.marketplacesService.handleOAuthCallback(
        marketplace,
        code,
        state,
      );

      this.logger.debug('Preparing success redirect');
      return this.redirectToMobileApp(
        res,
        marketplace,
        'success',
        undefined,
        MarketplaceConnectionStatusEnums.ACTIVE,
      );
    } catch (error) {
      this.logger.error(
        `OAuth callback error for marketplace ${marketplace}: ${error.message}`,
        error.stack,
      );

      let errorMessage = 'An unexpected error occurred during the OAuth flow.';
      if (error instanceof BadRequestException) {
        errorMessage = error.message;
      } else if (error instanceof NotFoundException) {
        errorMessage = error.message;
      }

      const config = this.marketplaceConfig.getMarketplaceConfig(
        marketplace as MarketplaceSlug,
      );
      await this.marketplacesService.updateMarketplaceStatus(
        state, // state contains userSupabaseId
        config.id,
        MarketplaceConnectionStatusEnums.DISCONNECTED,
        errorMessage,
      );

      this.logger.debug('Preparing error redirect');
      return this.redirectToMobileApp(
        res,
        marketplace,
        'error',
        errorMessage,
        MarketplaceConnectionStatusEnums.DISCONNECTED,
      );
    }
  }

  private redirectToMobileApp(
    res: Response,
    marketplace: string,
    status: 'success' | 'error',
    errorMessage?: string,
    connectionStatus?: MarketplaceConnectionStatusEnums,
  ): void {
    const config = this.marketplaceConfig.getMarketplaceConfig(
      marketplace as MarketplaceSlug,
    );
    if (!config) {
      this.logger.error(`Marketplace config not found for ${marketplace}`);
      res.status(500).send('Internal server error');
      return;
    }

    const mobileDeepLink = new URL(config.mobile_app.scheme);
    mobileDeepLink.searchParams.append('status', status);
    mobileDeepLink.searchParams.append('marketplace', marketplace);

    if (connectionStatus) {
      mobileDeepLink.searchParams.append('connectionStatus', connectionStatus);
    }

    if (status === 'error' && errorMessage) {
      mobileDeepLink.searchParams.append(
        'error',
        encodeURIComponent(errorMessage),
      );
    }

    this.logger.log(
      `Redirecting to ${status} URL: ${mobileDeepLink.toString()}`,
    );
    return res.redirect(302, mobileDeepLink.toString());
  }
}
