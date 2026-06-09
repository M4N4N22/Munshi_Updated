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
