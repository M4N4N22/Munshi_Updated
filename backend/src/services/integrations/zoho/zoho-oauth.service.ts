import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { TokenCryptoService } from '../token-crypto.service';
import { IntegrationAuthValidationService } from '../integration-auth.validation';
import { IntegrationRepository } from '../integration.repository';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
} from '../integration.constants';
import { IntegrationConnection } from '../integration.schema';
import { ZohoOAuthClient } from './zoho-oauth.client';
import { ZohoOAuthStateService } from './zoho-oauth-state.service';
import {
  ZOHO_INVENTORY_OAUTH_SCOPES,
  ZOHO_TOKEN_REFRESH_BUFFER_MS,
} from './zoho-oauth.constants';

export interface IntegrationConnectionSummary {
  id: number;
  provider: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_run_id: number | null;
  last_successful_sync_at: string | null;
}

@Injectable()
export class ZohoOAuthService {
  private readonly logger = new Logger(ZohoOAuthService.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly stateService: ZohoOAuthStateService,
    private readonly zohoClient: ZohoOAuthClient,
    private readonly authValidation: IntegrationAuthValidationService,
  ) {}

  async buildAuthorizeRedirectUrl(
    factoryId: number,
    userId: number,
  ): Promise<string> {
    await this.authValidation.assertCanManageIntegrations(factoryId, userId);

    const clientId = process.env.ZOHO_CLIENT_ID?.trim();
    const redirectUri = process.env.ZOHO_REDIRECT_URI?.trim();
    const accountsUrl = process.env.ZOHO_ACCOUNTS_URL?.replace(/\/$/, '');

    if (!clientId || !redirectUri || !accountsUrl) {
      throw new InternalServerErrorException('Zoho OAuth environment is not configured');
    }

    const state = this.stateService.createState(factoryId, userId);
    const params = new URLSearchParams({
      scope: ZOHO_INVENTORY_OAUTH_SCOPES,
      client_id: clientId,
      response_type: 'code',
      access_type: 'offline',
      redirect_uri: redirectUri,
      state,
      prompt: 'consent',
    });

    return `${accountsUrl}/oauth/v2/auth?${params.toString()}`;
  }

  async handleOAuthCallback(
    code: string | undefined,
    state: string | undefined,
    oauthError: string | undefined,
  ): Promise<{ redirectUrl: string }> {
    if (oauthError) {
      return { redirectUrl: this.webRedirect({ status: 'error', reason: oauthError }) };
    }
    if (!code || !state) {
      throw new BadRequestException('Missing OAuth code or state');
    }

    const payload = this.stateService.validateState(state, { markUsed: true });
    await this.authValidation.assertCanManageIntegrations(
      payload.factoryId,
      payload.userId,
    );

    let tokens;
    try {
      tokens = await this.zohoClient.exchangeAuthorizationCode(code);
    } catch (err) {
      this.logger.warn(
        `Zoho token exchange failed for factory #${payload.factoryId}`,
      );
      return {
        redirectUrl: this.webRedirect({
          factory_id: payload.factoryId,
          user_id: payload.userId,
          status: 'error',
          reason: 'token_exchange_failed',
        }),
      };
    }

    await this.persistActiveConnection({
      factoryId: payload.factoryId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSec: tokens.expires_in,
      metadata: {
        api_domain: tokens.api_domain ?? null,
        connected_by_user_id: payload.userId,
      },
    });

    return {
      redirectUrl: this.webRedirect({
        factory_id: payload.factoryId,
        user_id: payload.userId,
        status: 'connected',
      }),
    };
  }

  async disconnect(
    factoryId: number,
    userId: number,
    options?: { connectionId?: number; provider?: string },
  ): Promise<{ disconnected: boolean }> {
    await this.authValidation.assertCanManageIntegrations(factoryId, userId);

    const provider = options?.provider ?? INTEGRATION_PROVIDER.ZOHO_INVENTORY;
    let connection: IntegrationConnection | null = null;

    if (options?.connectionId) {
      connection = await this.integrationRepository.getConnection(
        options.connectionId,
        factoryId,
      );
    } else {
      connection = await this.integrationRepository.findActiveConnectionByProvider(
        factoryId,
        provider,
      );
    }

    if (!connection) {
      throw new NotFoundException('Active integration connection not found');
    }

    await this.integrationRepository.updateConnection(connection.id, factoryId, {
      status: INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
      access_token: null,
      refresh_token: null,
      expires_at: null,
    });

    return { disconnected: true };
  }

  async listConnections(
    factoryId: number,
    userId: number,
  ): Promise<IntegrationConnectionSummary[]> {
    await this.authValidation.assertCanManageIntegrations(factoryId, userId);
    const rows = await this.integrationRepository.listConnectionsByFactory(
      factoryId,
    );
    return Promise.all(rows.map((row) => this.toSummaryWithSync(row)));
  }

  async refreshConnectionIfNeeded(
    connectionId: number,
  ): Promise<IntegrationConnection> {
    const connection = await this.integrationRepository.getConnectionById(
      connectionId,
    );
    if (!connection) {
      throw new NotFoundException(`Integration connection #${connectionId} not found`);
    }
    if (connection.status !== INTEGRATION_CONNECTION_STATUS.ACTIVE) {
      return connection;
    }

    const expiresAt = connection.expires_at?.getTime() ?? 0;
    if (expiresAt > Date.now() + ZOHO_TOKEN_REFRESH_BUFFER_MS) {
      return connection;
    }

    if (!connection.refresh_token) {
      throw new BadRequestException(
        'Connection has no refresh token; reconnect Zoho',
      );
    }

    const refreshToken = this.tokenCrypto.decrypt(connection.refresh_token);
    const tokens = await this.zohoClient.refreshAccessToken(refreshToken);

    const encryptedAccess = this.tokenCrypto.encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? this.tokenCrypto.encrypt(tokens.refresh_token)
      : connection.refresh_token;

    const updated = await this.integrationRepository.updateConnection(
      connection.id,
      connection.factory_id,
      {
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        expires_at: this.expiresAtFromSec(tokens.expires_in),
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
        metadata: {
          ...(connection.metadata as object),
          api_domain: tokens.api_domain ?? (connection.metadata as any)?.api_domain,
        },
      },
    );

    if (!updated) {
      throw new NotFoundException(`Integration connection #${connectionId} not found`);
    }
    return updated;
  }

  private async persistActiveConnection(input: {
    factoryId: number;
    accessToken: string;
    refreshToken?: string;
    expiresInSec: number;
    metadata: object;
  }): Promise<IntegrationConnection> {
    const encryptedAccess = this.tokenCrypto.encrypt(input.accessToken);
    const encryptedRefresh = input.refreshToken
      ? this.tokenCrypto.encrypt(input.refreshToken)
      : null;
    const expiresAt = this.expiresAtFromSec(input.expiresInSec);

    const existingActive =
      await this.integrationRepository.findActiveConnectionByProvider(
        input.factoryId,
        INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      );
    if (existingActive) {
      const updated = await this.integrationRepository.updateConnection(
        existingActive.id,
        input.factoryId,
        {
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          expires_at: expiresAt,
          status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
          metadata: input.metadata,
        },
      );
      return updated!;
    }

    const reactivatable =
      await this.integrationRepository.connectionModel.findOne({
        where: {
          factory_id: input.factoryId,
          provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
          status: {
            [Op.in]: [
              INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
              INTEGRATION_CONNECTION_STATUS.ERROR,
            ],
          },
        },
        order: [['updated_at', 'DESC']],
      });

    if (reactivatable) {
      const updated = await this.integrationRepository.updateConnection(
        reactivatable.id,
        input.factoryId,
        {
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          expires_at: expiresAt,
          status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
          metadata: input.metadata,
        },
      );
      return updated!;
    }

    return this.integrationRepository.createConnection({
      factory_id: input.factoryId,
      provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      expires_at: expiresAt,
      metadata: input.metadata,
    });
  }

  private expiresAtFromSec(expiresInSec: number): Date {
    return new Date(Date.now() + expiresInSec * 1000);
  }

  private async toSummaryWithSync(
    row: IntegrationConnection,
  ): Promise<IntegrationConnectionSummary> {
    const base = this.toSummary(row);
    const latest = await this.integrationRepository.getLatestPullSyncRun(
      row.id,
      row.factory_id,
    );
    const latestSuccess =
      await this.integrationRepository.getLatestSuccessfulPullSyncRun(
        row.id,
        row.factory_id,
      );

    return {
      ...base,
      last_sync_at: latest
        ? (latest.finished_at ?? latest.started_at)?.toISOString() ?? null
        : null,
      last_sync_status: latest?.status ?? null,
      last_sync_run_id: latest?.id ?? null,
      last_successful_sync_at: latestSuccess?.finished_at
        ? latestSuccess.finished_at.toISOString()
        : null,
    };
  }

  private toSummary(row: IntegrationConnection): IntegrationConnectionSummary {
    const created = (row as IntegrationConnection & { created_at?: Date }).created_at;
    const updated = (row as IntegrationConnection & { updated_at?: Date }).updated_at;
    return {
      id: row.id,
      provider: row.provider,
      status: row.status,
      expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      created_at: created ? created.toISOString() : new Date(0).toISOString(),
      updated_at: updated ? updated.toISOString() : new Date(0).toISOString(),
      last_sync_at: null,
      last_sync_status: null,
      last_sync_run_id: null,
      last_successful_sync_at: null,
    };
  }

  private webRedirect(params: Record<string, string | number | undefined>): string {
    const base =
      process.env.MUNSHI_WEB_URL?.replace(/\/$/, '') ||
      'http://localhost:3000';
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        search.set(key, String(value));
      }
    }
    const qs = search.toString();
    return `${base}/integrations${qs ? `?${qs}` : ''}`;
  }
}
