export interface Supplier {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export type SupplierInput = Omit<Supplier, '_id'>;
