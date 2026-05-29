/** Inventory item foundation shape — quantity mutations deferred to Prompt 3+. */
export interface IInventoryItemRecord {
  id: number;
  factory_id: number;
  category_id?: number | null;
  location_id?: number | null;
  sku: string;
  name: string;
  unit: string;
  current_quantity: string;
  reorder_threshold?: string | null;
  is_active: boolean;
}

export interface IInventoryCategoryRecord {
  id: number;
  factory_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface IInventoryLocationRecord {
  id: number;
  factory_id: number;
  name: string;
  code?: string | null;
  address?: string | null;
  is_active: boolean;
}

export interface IInventoryTransactionRecord {
  id: number;
  factory_id: number;
  inventory_item_id: number;
  transaction_type: string;
  quantity: string;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
}
