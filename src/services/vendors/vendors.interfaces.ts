/** Vendor record shape for future TraderOS procurement modules. */
export interface IVendorRecord {
  id: number;
  factory_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active: boolean;
}
