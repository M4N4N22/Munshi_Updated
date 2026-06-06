import { Module } from '@nestjs/common';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { IntegrationRepository } from './integration.repository';
import { IntegrationAuthValidationService } from './integration-auth.validation';
import { TokenCryptoService } from './token-crypto.service';
import { ZohoOAuthController } from './zoho/zoho-oauth.controller';
import { ZohoSyncController } from './zoho/zoho-sync.controller';
import { ZohoOAuthService } from './zoho/zoho-oauth.service';
import { ZohoOAuthStateService } from './zoho/zoho-oauth-state.service';
import { ZohoOAuthClient } from './zoho/zoho-oauth.client';
import { ZohoInventoryClient } from './zoho/zoho-inventory.client';
import { ZohoPullSyncService } from './zoho/zoho-pull-sync.service';
import { ZohoScheduledSyncService } from './zoho/zoho-scheduled-sync.service';
import { ZohoScheduledSyncCron } from './zoho/zoho-scheduled-sync.cron';
import { ZohoStockPushHandler } from './zoho/zoho-stock-push.handler';
import { ZohoPushExecutionService } from './zoho/zoho-push-execution.service';
import { ZohoPushRetryService } from './zoho/zoho-push-retry.service';
import { ZohoPushRetryCron } from './zoho/zoho-push-retry.cron';

@Module({
  imports: [InventoryModule],
  controllers: [ZohoOAuthController, ZohoSyncController],
  providers: [
    IntegrationRepository,
    IntegrationAuthValidationService,
    TokenCryptoService,
    ZohoOAuthStateService,
    ZohoOAuthClient,
    ZohoOAuthService,
    ZohoInventoryClient,
    ZohoPullSyncService,
    ZohoScheduledSyncService,
    ZohoScheduledSyncCron,
    ZohoPushExecutionService,
    ZohoStockPushHandler,
    ZohoPushRetryService,
    ZohoPushRetryCron,
  ],
  exports: [
    IntegrationRepository,
    TokenCryptoService,
    ZohoOAuthService,
    ZohoOAuthClient,
    ZohoInventoryClient,
    ZohoPullSyncService,
    ZohoScheduledSyncService,
    ZohoStockPushHandler,
    ZohoPushExecutionService,
    ZohoPushRetryService,
  ],
})
export class IntegrationModule {}
