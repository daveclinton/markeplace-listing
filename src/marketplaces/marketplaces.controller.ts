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
  ApiQuery,
} from '@nestjs/swagger';

import { MarketplacesService } from './marketplaces.service';
import { MarketplaceConfigService } from './marketplaces.config';
import {
  GenerateOAuthUrlDto,
  LinkMarketplaceDto,
  OAuthCallbackDto,
} from './dto/marketplace.dto';
import {
  MarketplaceSlug,
  MarketplaceConfig,
  MarketplaceConfigWithOAuth,
  MarketplaceStatus,
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

  @Get()
  @ApiOperation({ summary: 'Get all available marketplaces' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of all available marketplaces',
  })
  async getAllMarketplaces(): Promise<MarketplaceConfig[]> {
    return this.marketplaceConfig.getAllMarketplaces();
  }

  @Get('supported')
  @ApiOperation({ summary: 'Get supported marketplaces' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of supported marketplaces',
  })
  async getSupportedMarketplaces(): Promise<MarketplaceConfig[]> {
    return this.marketplaceConfig.getSupportedMarketplaces();
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

  @Post('oauth/url')
  @ApiOperation({ summary: 'Generate OAuth URL' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns OAuth URL for the specified marketplace',
  })
  async generateOAuthUrl(
    @Body() urlDto: GenerateOAuthUrlDto,
  ): Promise<{ url: string }> {
    try {
      if (!this.marketplaceConfig.isMarketplaceSupported(urlDto.marketplace)) {
        throw new BadRequestException(
          `Marketplace ${urlDto.marketplace} is not supported`,
        );
      }

      const url = await this.marketplacesService.generateOAuthUrl(
        urlDto.marketplace,
        urlDto.userSupabaseId,
      );

      return { url };
    } catch (error) {
      this.logger.error(`Error generating OAuth URL: ${error.message}`);
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

      await this.marketplacesService.handleOAuthCallback(
        marketplace as MarketplaceSlug,
        callbackDto.code,
        callbackDto.userSupabaseId,
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

  @Get(':marketplace/status')
  @ApiOperation({ summary: 'Get marketplace connection status' })
  @ApiParam({
    name: 'marketplace',
    enum: ['ebay', 'facebook'],
    description: 'Marketplace identifier',
  })
  @ApiQuery({
    name: 'userSupabaseId',
    description: 'Supabase user ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns marketplace connection status',
    type: 'object',
    schema: {
      properties: {
        status: {
          type: 'object',
          properties: {
            isLinked: { type: 'boolean' },
            tokenStatus: {
              type: 'string',
              enum: ['valid', 'expired', 'none'],
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
      },
    },
  })
  async getMarketplaceStatus(
    @Param('marketplace') marketplace: MarketplaceSlug,
    @Query('userSupabaseId') userSupabaseId: string,
  ): Promise<{ status: MarketplaceStatus }> {
    try {
      if (!this.marketplaceConfig.isMarketplaceSupported(marketplace)) {
        throw new BadRequestException(
          `Marketplace ${marketplace} is not supported`,
        );
      }

      const status = await this.marketplacesService.getMarketplaceStatus(
        marketplace,
        userSupabaseId,
      );

      return { status };
    } catch (error) {
      this.logger.error(`Error fetching marketplace status: ${error.message}`);
      throw error;
    }
  }
}
