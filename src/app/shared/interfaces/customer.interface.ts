export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isDefaultWalking?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
}

export type CustomerInput = Omit<Customer, '_id'>;
