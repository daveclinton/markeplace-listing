import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  BadRequestException,
  Logger,
  Res,
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
import { LinkMarketplaceDto, OAuthCallbackDto } from './dto/marketplace.dto';
import {
  MarketplaceSlug,
  MarketplaceConfigWithOAuth,
} from './marketplace.types';

@ApiTags('marketplaces')
@Controller('marketplaces')
@ApiBearerAuth()
export class MarketplacesController {
  private readonly logger = new Logger(MarketplacesController.name);

  constructor(
    private readonly marketplacesService: MarketplacesService,
    private readonly marketplaceConfig: MarketplaceConfigService,
  ) {}

  @Get(':userSupabaseId')
  @ApiOperation({ summary: 'Get user marketplaces' })
  @ApiParam({
    name: 'userSupabaseId',
    description: 'Supabase user ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of user marketplaces',
  })
  async getMarketplacesForUser(
    @Param('userSupabaseId') userSupabaseId: string,
  ): Promise<MarketplaceConfigWithOAuth[]> {
    try {
      return await this.marketplacesService.getMarketplacesForUser(
        userSupabaseId,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching marketplaces for user: ${error.message}`,
      );
      throw error;
    }
  }

  @Post(':userSupabaseId/link')
  @ApiOperation({ summary: 'Link/unlink marketplace' })
  @ApiParam({
    name: 'userSupabaseId',
    description: 'Supabase user ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Marketplace linked/unlinked successfully',
  })
  async linkMarketplace(
    @Param('userSupabaseId') userSupabaseId: string,
    @Body() linkDto: LinkMarketplaceDto,
  ): Promise<{ status: number; message: string }> {
    try {
      if (!this.marketplaceConfig.isMarketplaceSupported(linkDto.marketplace)) {
        throw new BadRequestException(
          `Marketplace ${linkDto.marketplace} is not supported`,
        );
      }

      const config = this.marketplaceConfig.getMarketplaceConfig(
        linkDto.marketplace,
      );
      await this.marketplacesService.linkMarketplace(
        userSupabaseId,
        config.id,
        linkDto.link,
      );

      return {
        status: HttpStatus.OK,
        message: linkDto.link ? 'Marketplace linked' : 'Marketplace unlinked',
      };
    } catch (error) {
      this.logger.error(`Error linking marketplace: ${error.message}`);
      throw error;
    }
  }

  @Get('oauth/callback/:marketplace')
  @ApiOperation({ summary: 'Handle OAuth callback and redirect to mobile app' })
  async handleOAuthCallback(
    @Param('marketplace') marketplace: string,
    @Query() callbackDto: OAuthCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (
        !this.marketplaceConfig.isMarketplaceSupported(
          marketplace as MarketplaceSlug,
        )
      ) {
        throw new BadRequestException(
          `Marketplace ${marketplace} is not supported`,
        );
      }

      // Extract state from query parameters
      const state = callbackDto.state;
      if (!state) {
        throw new BadRequestException('Missing state parameter');
      }

      // Retrieve user ID associated with state
      const userSupabaseId =
        await this.marketplacesService.getUserIdFromState(state);
      if (!userSupabaseId) {
        throw new BadRequestException('Invalid state parameter');
      }

      this.logger.debug(
        `Processing OAuth callback for marketplace: ${marketplace}, code: ${callbackDto.code}`,
      );

      await this.marketplacesService.handleOAuthCallback(
        marketplace as MarketplaceSlug,
        callbackDto.code,
        userSupabaseId,
      );

      const config = this.marketplaceConfig.getMarketplaceConfig(
        marketplace as MarketplaceSlug,
      );

      const mobileDeepLink = new URL(config.mobile_app.scheme);
      mobileDeepLink.searchParams.append('status', 'success');
      mobileDeepLink.searchParams.append('marketplace', marketplace);

      return res.redirect(302, mobileDeepLink.toString());
    } catch (error) {
      this.logger.error(`OAuth callback error: ${error.message}`);

      const config = this.marketplaceConfig.getMarketplaceConfig(
        marketplace as MarketplaceSlug,
      );

      const mobileDeepLink = new URL(config.mobile_app.scheme);
      mobileDeepLink.searchParams.append('status', 'error');
      mobileDeepLink.searchParams.append('marketplace', marketplace);
      mobileDeepLink.searchParams.append(
        'error',
        encodeURIComponent(error.message),
      );

      return res.redirect(302, mobileDeepLink.toString());
    }
  }
}
