export interface IInventoryCategoryRecord {
  id: number;
  factory_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IInventoryLocationRecord {
  id: number;
  factory_id: number;
  name: string;
  code?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IInventoryItemRecord {
  id: number;
  factory_id: number;
  category_id: number;
  location_id: number;
  sku: string;
  name: string;
  unit: string;
  current_quantity: string;
  reorder_threshold?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  category?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
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
  created_at?: Date;
}

export interface IInventoryStatusRecord {
  item_id: number;
  factory_id: number;
  name: string;
  sku: string;
  unit: string;
  location_id: number;
  location_name: string;
  category_id: number;
  category_name: string;
  current_quantity: string;
  reorder_threshold: string | null;
  is_low_stock: boolean;
  is_active: boolean;
}

export interface IInventoryListMeta {
  total: number;
  page: number;
  page_size: number;
}

export interface IInventoryListResult<T> {
  data: T[];
  meta: IInventoryListMeta;
}
