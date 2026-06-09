export interface AdminClientSummaryRow {
  id: number;
  name: string;
  address: string | null;
  created_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  team_members: number;
  inventory_items: number;
  zoho_connected: boolean;
  bank_consent_status: string | null;
}

export interface AdminClientsOverview {
  clients: AdminClientSummaryRow[];
  totals: {
    factories: number;
    with_zoho: number;
    with_bank_consent: number;
    total_team_members: number;
    total_inventory_items: number;
  };
}

export interface AdminClientEmployee {
  user_id: number;
  name: string | null;
  phone_number: string;
  role: string;
  doj: string | null;
  joined_at: string;
}

export interface AdminClientInventoryItem {
  id: number;
  sku: string;
  name: string;
  unit: string;
  current_quantity: number;
  reorder_threshold: number | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminClientDetail {
  factory: {
    id: number;
    name: string;
    address: string | null;
    created_at: string;
    zoho_connected: boolean;
    bank_consent_status: string | null;
  };
  employees: AdminClientEmployee[];
  inventory: AdminClientInventoryItem[];
}
