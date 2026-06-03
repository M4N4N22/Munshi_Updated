/** Vendor record shape for TraderOS procurement modules. */
export interface IVendorRecord {
  id: number;
  factory_id: number;
  name: string;
  phone_number: string;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IVendorListResult {
  data: IVendorRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface IVendorCreateInput {
  factory_id: number;
  name: string;
  phone_number: string;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface IVendorUpdateInput {
  name?: string;
  phone_number?: string;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface IVendorListOptions {
  page?: number;
  limit?: number;
  search?: string;
  activeOnly?: boolean;
}

export interface IVendorExistsOptions {
  name?: string;
  phone_number?: string;
  excludeId?: number;
}
