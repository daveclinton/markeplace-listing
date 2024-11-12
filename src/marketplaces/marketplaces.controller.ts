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
  NotFoundException,
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
import { LinkMarketplaceDto } from './dto/marketplace.dto';
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
  ) {
    this.logger.log('MarketplacesController initialized');
  }

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
    this.logger.log(
      `Attempting to ${
        linkDto.link ? 'link' : 'unlink'
      } marketplace ${linkDto.marketplace} for user ${userSupabaseId}`,
    );

    try {
      this.logger.debug(
        `Checking if marketplace ${linkDto.marketplace} is supported`,
      );
      if (!this.marketplaceConfig.isMarketplaceSupported(linkDto.marketplace)) {
        this.logger.warn(
          `Attempt to link unsupported marketplace: ${linkDto.marketplace}`,
        );
        throw new BadRequestException(
          `Marketplace ${linkDto.marketplace} is not supported`,
        );
      }

      this.logger.debug(
        `Getting config for marketplace ${linkDto.marketplace}`,
      );
      const config = this.marketplaceConfig.getMarketplaceConfig(
        linkDto.marketplace,
      );

      await this.marketplacesService.linkMarketplace(
        userSupabaseId,
        config.id,
        linkDto.link,
      );

      const message = linkDto.link
        ? 'Marketplace linked'
        : 'Marketplace unlinked';
      this.logger.log(
        `Successfully ${
          linkDto.link ? 'linked' : 'unlinked'
        } marketplace ${linkDto.marketplace} for user ${userSupabaseId}`,
      );

      return {
        status: HttpStatus.OK,
        message,
      };
    } catch (error) {
      this.logger.error(
        `Error ${linkDto.link ? 'linking' : 'unlinking'} marketplace ${
          linkDto.marketplace
        } for user ${userSupabaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('callback/:marketplace')
  async handleOAuthCallback(
    @Param('marketplace') marketplace: string,
    @Query('state') state: string,
    @Query('code') code: string,
    @Query('expires_in') expiresIn: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Handling OAuth callback for marketplace: ${marketplace}`);
    this.logger.debug(
      `OAuth callback params - State: ${state}, Code: ${code}, ExpiresIn: ${expiresIn}`,
    );

    try {
      this.logger.debug(`Verifying marketplace ${marketplace} support`);
      if (
        !this.marketplaceConfig.isMarketplaceSupported(
          marketplace as MarketplaceSlug,
        )
      ) {
        this.logger.warn(`Unsupported marketplace in callback: ${marketplace}`);
        throw new BadRequestException(
          `Marketplace ${marketplace} is not supported`,
        );
      }

      this.logger.debug(`Extracting user ID from state: ${state}`);
      const userSupabaseId =
        await this.marketplacesService.getUserIdFromState(state);
      if (!userSupabaseId) {
        this.logger.warn(`Invalid state parameter received: ${state}`);
        throw new BadRequestException('Invalid state parameter');
      }

      this.logger.debug(
        `Processing OAuth callback for marketplace: ${marketplace}, user: ${userSupabaseId}`,
      );
      await this.marketplacesService.handleOAuthCallback(
        marketplace,
        code,
        userSupabaseId,
      );

      this.logger.debug('Preparing success redirect');
      const config = this.marketplaceConfig.getMarketplaceConfig(
        marketplace as MarketplaceSlug,
      );
      const mobileDeepLink = new URL(config.mobile_app.scheme);
      mobileDeepLink.searchParams.append('status', 'success');
      mobileDeepLink.searchParams.append('marketplace', marketplace);

      this.logger.log(
        `Successfully processed OAuth callback. Redirecting to: ${mobileDeepLink.toString()}`,
      );
      return res.redirect(302, mobileDeepLink.toString());
    } catch (error) {
      this.logger.error(
        `OAuth callback error for marketplace ${marketplace}: ${error.message}`,
        error.stack,
      );

      let errorMessage = 'An unexpected error occurred during the OAuth flow.';
      if (error instanceof BadRequestException) {
        errorMessage = error.message;
        this.logger.debug(`BadRequestException: ${error.message}`);
      } else if (error instanceof NotFoundException) {
        errorMessage = error.message;
        this.logger.debug(`NotFoundException: ${error.message}`);
      }

      this.logger.debug('Preparing error redirect');
      const config = this.marketplaceConfig.getMarketplaceConfig(
        marketplace as MarketplaceSlug,
      );
      const mobileDeepLink = new URL(config.mobile_app.scheme);
      mobileDeepLink.searchParams.append('status', 'error');
      mobileDeepLink.searchParams.append('marketplace', marketplace);
      mobileDeepLink.searchParams.append(
        'error',
        encodeURIComponent(errorMessage),
      );

      this.logger.log(`Redirecting to error URL: ${mobileDeepLink.toString()}`);
      return res.redirect(302, mobileDeepLink.toString());
    }
  }
}
