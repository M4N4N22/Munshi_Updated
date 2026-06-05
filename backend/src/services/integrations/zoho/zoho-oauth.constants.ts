/** Zoho Inventory OAuth scopes — used at connect; pull sync reuses the same connection. */
export const ZOHO_INVENTORY_OAUTH_SCOPES = [
  'ZohoInventory.items.READ',
  'ZohoInventory.settings.READ',
].join(',');

export const ZOHO_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export const ZOHO_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
