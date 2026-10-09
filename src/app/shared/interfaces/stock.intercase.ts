export interface Stock {
  _id: string;
  productId: string;
  batchNumber: string;
  costPrice: number;
  retailPrice: number;
  receivedQty: number;
  availableQty: number;
  receivedAt: Date;
  expiryDate?: Date | null;
  expiredQty: number;
  damagedQty: number;
  obsoleteQty: number;
  isDeadStock: boolean;
  isActive: boolean;
  isDeleted: boolean;
}
