import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OAuthTokenRefreshService } from './oauth-token-refresh.service';

@Injectable()
export class TokenRefreshScheduler {
  private readonly logger = new Logger(TokenRefreshScheduler.name);

  constructor(private readonly oauthTokenRefresh: OAuthTokenRefreshService) {}

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
