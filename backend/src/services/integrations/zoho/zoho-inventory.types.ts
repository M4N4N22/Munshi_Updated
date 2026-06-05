import { IntegrationConnection } from '../integration.schema';

/** Normalized Zoho Inventory item for Munshi pull sync. */
export type ZohoInventoryItemRecord = {
  item_id: string;
  sku: string;
  name: string;
  unit: string;
  category_name: string;
  location_name: string;
  available_stock: number;
  reorder_level?: number | null;
};

export type ZohoInventoryListPage = {
  items: ZohoInventoryItemRecord[];
  hasMore: boolean;
  page: number;
};

export type ZohoInventoryFetchAllHandler = (
  accessToken: string,
  apiDomain: string,
) => Promise<ZohoInventoryItemRecord[]>;

export type ZohoInventoryListPageHandler = (
  accessToken: string,
  apiDomain: string,
  page: number,
) => Promise<ZohoInventoryListPage>;

/** Munshi → Zoho inventory adjustment request body (quantity type). */
export type ZohoInventoryAdjustmentRequestBody = {
  date: string;
  reason: string;
  description: string;
  adjustment_type: 'quantity';
  line_items: Array<{
    item_id: string;
    quantity_adjusted: string;
  }>;
};

export type ZohoAdjustStockInput = {
  connection: IntegrationConnection;
  externalItemId: string;
  quantity: string | number;
  transactionType: string;
  /** Munshi inventory_transaction_id — included in Zoho reason/description only. */
  referenceId: string | number;
};

export type ZohoAdjustStockSuccess = {
  success: true;
  externalReference: string;
};

export type ZohoAdjustStockErrorCode =
  | 'unauthorized'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'invalid_request'
  | 'configuration_error';

export type ZohoAdjustStockFailure = {
  success: false;
  code: ZohoAdjustStockErrorCode;
  message: string;
  httpStatus?: number;
  retryable: boolean;
};

export type ZohoAdjustStockResult = ZohoAdjustStockSuccess | ZohoAdjustStockFailure;

export type ZohoAdjustStockHandlerContext = {
  accessToken: string;
  apiDomain: string;
  organizationId: string;
  input: ZohoAdjustStockInput;
  requestBody: ZohoInventoryAdjustmentRequestBody;
  signedQuantity: string;
};

export type ZohoAdjustStockHandler = (
  context: ZohoAdjustStockHandlerContext,
) => Promise<ZohoAdjustStockResult>;
