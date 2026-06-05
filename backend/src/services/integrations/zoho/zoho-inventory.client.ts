import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { TokenCryptoService } from '../token-crypto.service';
import {
  ZohoAdjustStockHandler,
  ZohoAdjustStockInput,
  ZohoAdjustStockResult,
  ZohoInventoryAdjustmentRequestBody,
  ZohoInventoryFetchAllHandler,
  ZohoInventoryItemRecord,
  ZohoInventoryListPage,
  ZohoInventoryListPageHandler,
} from './zoho-inventory.types';
import { ZohoOAuthService } from './zoho-oauth.service';

const DEFAULT_PAGE_SIZE = 200;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const ADJUST_STOCK_TIMEOUT_MS = 30000;

@Injectable()
export class ZohoInventoryClient {
  private readonly logger = new Logger(ZohoInventoryClient.name);
  private readonly http: AxiosInstance;
  private fetchAllHandler: ZohoInventoryFetchAllHandler | null = null;
  private listPageHandler: ZohoInventoryListPageHandler | null = null;
  private adjustStockHandler: ZohoAdjustStockHandler | null = null;

  constructor(
    private readonly zohoOAuthService: ZohoOAuthService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {
    this.http = axios.create({ timeout: 30000 });
  }

  setFetchAllHandler(handler: ZohoInventoryFetchAllHandler | null): void {
    this.fetchAllHandler = handler;
  }

  setListPageHandler(handler: ZohoInventoryListPageHandler | null): void {
    this.listPageHandler = handler;
  }

  setAdjustStockHandler(handler: ZohoAdjustStockHandler | null): void {
    this.adjustStockHandler = handler;
  }

  /**
   * Outbound stock adjustment — Zoho only (R-Z06).
   * Never writes Munshi inventory or calls InventoryTransactionService.
   *
   * Mapping assumptions:
   * - STOCK_OUT → negative quantity_adjusted
   * - STOCK_IN → positive quantity_adjusted
   * - Zoho POST /inventory/v1/inventoryadjustments (adjustment_type=quantity)
   * - item_id and quantity_adjusted sent as strings (Zoho large-ID safety)
   * - organization_id from connection.metadata.org_id
   */
  async adjustStock(input: ZohoAdjustStockInput): Promise<ZohoAdjustStockResult> {
    const signedQuantity = this.resolveSignedQuantity(
      input.transactionType,
      input.quantity,
    );
    if (signedQuantity === null) {
      return {
        success: false,
        code: 'invalid_request',
        message: `Unsupported transaction type "${input.transactionType}" for Zoho adjustment`,
        retryable: false,
      };
    }

    const refreshed = await this.zohoOAuthService.refreshConnectionIfNeeded(
      input.connection.id,
    );
    if (!refreshed.access_token) {
      return {
        success: false,
        code: 'configuration_error',
        message: 'Integration connection has no access token',
        retryable: false,
      };
    }

    const accessToken = this.tokenCrypto.decrypt(refreshed.access_token);
    const metadata = (refreshed.metadata ?? {}) as {
      api_domain?: string;
      org_id?: string;
    };
    const apiDomain =
      metadata.api_domain?.replace(/\/$/, '') ||
      process.env.ZOHO_INVENTORY_API_DOMAIN?.replace(/\/$/, '') ||
      'https://www.zohoapis.in';
    const organizationId = metadata.org_id?.trim();
    if (!organizationId) {
      return {
        success: false,
        code: 'configuration_error',
        message: 'Missing org_id in connection metadata',
        retryable: false,
      };
    }

    const requestBody: ZohoInventoryAdjustmentRequestBody = {
      date: new Date().toISOString().slice(0, 10),
      reason: `Munshi sync ref ${input.referenceId}`,
      description: `Munshi inventory transaction ${input.referenceId}`,
      adjustment_type: 'quantity',
      line_items: [
        {
          item_id: String(input.externalItemId),
          quantity_adjusted: signedQuantity,
        },
      ],
    };

    const context = {
      accessToken,
      apiDomain,
      organizationId,
      input,
      requestBody,
      signedQuantity,
    };

    if (this.adjustStockHandler) {
      return this.adjustStockHandler(context);
    }

    return this.postInventoryAdjustment(accessToken, apiDomain, organizationId, requestBody);
  }

  async fetchAllItems(
    accessToken: string,
    apiDomain: string,
  ): Promise<ZohoInventoryItemRecord[]> {
    if (this.fetchAllHandler) {
      return this.fetchAllHandler(accessToken, apiDomain);
    }

    const all: ZohoInventoryItemRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.listItemsPage(accessToken, apiDomain, page);
      all.push(...result.items);
      hasMore = result.hasMore;
      page += 1;
    }

    return all;
  }

  async listItemsPage(
    accessToken: string,
    apiDomain: string,
    page: number,
  ): Promise<ZohoInventoryListPage> {
    if (this.listPageHandler) {
      return this.listPageHandler(accessToken, apiDomain, page);
    }

    const base = apiDomain.replace(/\/$/, '');
    const url = `${base}/inventory/v1/items`;
    const res = await this.requestWithRetry<{ items?: unknown[]; page_context?: Record<string, unknown> }>(
      url,
      accessToken,
      { page, per_page: DEFAULT_PAGE_SIZE },
    );

    const rawItems = Array.isArray(res.items) ? res.items : [];
    const pageContext = res.page_context ?? {};
    const hasMore = Boolean(pageContext.has_more_page);

    return {
      items: rawItems.map((row) => this.normalizeItem(row)),
      hasMore,
      page,
    };
  }

  private async postInventoryAdjustment(
    accessToken: string,
    apiDomain: string,
    organizationId: string,
    body: ZohoInventoryAdjustmentRequestBody,
  ): Promise<ZohoAdjustStockResult> {
    const base = apiDomain.replace(/\/$/, '');
    const url = `${base}/inventory/v1/inventoryadjustments`;

    try {
      const res = await this.http.post<{ inventory_adjustment?: Record<string, unknown> }>(
        url,
        body,
        {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
          params: { organization_id: organizationId },
          timeout: ADJUST_STOCK_TIMEOUT_MS,
        },
      );

      const adjustment = res.data?.inventory_adjustment ?? res.data;
      const externalReference = String(
        (adjustment as Record<string, unknown>)?.inventory_adjustment_id ??
          (adjustment as Record<string, unknown>)?.adjustment_id ??
          '',
      ).trim();

      if (!externalReference) {
        return {
          success: false,
          code: 'server_error',
          message: 'Zoho adjustment response missing reference id',
          httpStatus: res.status,
          retryable: true,
        };
      }

      return { success: true, externalReference };
    } catch (err: unknown) {
      return this.mapAdjustStockError(err);
    }
  }

  private mapAdjustStockError(err: unknown): ZohoAdjustStockResult {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const message =
        (axiosErr.response?.data as { message?: string } | undefined)?.message ??
        axiosErr.message;

      if (
        axiosErr.code === 'ECONNABORTED' ||
        axiosErr.code === 'ETIMEDOUT' ||
        axiosErr.code === 'ERR_NETWORK'
      ) {
        return {
          success: false,
          code: 'network_error',
          message: message || 'Zoho Inventory adjustment request timed out',
          retryable: true,
        };
      }

      if (status === 401) {
        return {
          success: false,
          code: 'unauthorized',
          message: message || 'Zoho Inventory unauthorized',
          httpStatus: 401,
          retryable: true,
        };
      }

      if (status === 429) {
        return {
          success: false,
          code: 'rate_limited',
          message: message || 'Zoho Inventory rate limit exceeded',
          httpStatus: 429,
          retryable: true,
        };
      }

      if (status && status >= 500) {
        return {
          success: false,
          code: 'server_error',
          message: message || 'Zoho Inventory server error',
          httpStatus: status,
          retryable: true,
        };
      }

      return {
        success: false,
        code: 'invalid_request',
        message: message || 'Zoho Inventory adjustment request failed',
        httpStatus: status,
        retryable: false,
      };
    }

    this.logger.warn(`Zoho adjustStock unexpected error: ${String(err)}`);
    return {
      success: false,
      code: 'server_error',
      message: 'Unexpected error during Zoho adjustment',
      retryable: true,
    };
  }

  /**
   * STOCK_OUT → negative adjustment; STOCK_IN → positive.
   * Quantity magnitude is always absolute before sign is applied.
   */
  resolveSignedQuantity(
    transactionType: string,
    quantity: string | number,
  ): string | null {
    const magnitude = Math.abs(Number(quantity));
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      return null;
    }

    const normalized = String(transactionType).trim().toUpperCase();
    if (normalized === 'STOCK_OUT') {
      return String(-magnitude);
    }
    if (normalized === 'STOCK_IN') {
      return String(magnitude);
    }
    return null;
  }

  private async requestWithRetry<T>(
    url: string,
    accessToken: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const res = await this.http.get<T>(url, {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
          params,
        });
        return res.data;
      } catch (err: unknown) {
        lastError = err;
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (attempt < MAX_RETRIES && (status === 429 || (status && status >= 500))) {
          await this.sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        this.logger.warn(`Zoho Inventory API request failed (${status ?? 'unknown'})`);
        throw new InternalServerErrorException('Zoho Inventory API request failed');
      }
    }
    throw lastError;
  }

  private normalizeItem(raw: unknown): ZohoInventoryItemRecord {
    const row = raw as Record<string, unknown>;
    const itemId = String(row.item_id ?? row.id ?? '');
    const sku = String(row.sku ?? row.item_name ?? itemId);
    const name = String(row.name ?? row.item_name ?? sku);
    const unit = String(row.unit ?? 'pcs');
    const categoryName = String(
      row.category_name ??
        (row.category as { category_name?: string } | undefined)?.category_name ??
        '',
    );
    const locationName = String(
      row.warehouse_name ??
        row.location_name ??
        (row.warehouse as { warehouse_name?: string } | undefined)?.warehouse_name ??
        '',
    );
    const stockRaw =
      row.available_stock ??
      row.stock_on_hand ??
      row.actual_available_stock ??
      0;
    const availableStock = Number(stockRaw);
    const reorderLevel =
      row.reorder_level != null ? Number(row.reorder_level) : null;

    return {
      item_id: itemId,
      sku,
      name,
      unit,
      category_name: categoryName,
      location_name: locationName,
      available_stock: Number.isFinite(availableStock) ? availableStock : 0,
      reorder_level: Number.isFinite(reorderLevel!) ? reorderLevel : null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
