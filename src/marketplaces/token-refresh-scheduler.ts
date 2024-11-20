import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OAuthTokenRefreshService } from './oauth-token-refresh.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class TokenRefreshScheduler {
  constructor(
    private readonly oauthTokenRefresh: OAuthTokenRefreshService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleTokenRefresh() {
    this.logger.debug('Starting scheduled token refresh');
    try {
      await this.oauthTokenRefresh.refreshExpiredTokens();
    } catch (error) {
      this.logger.error('Scheduled token refresh failed:', error.stack);
    }
  }
}
