import { INVENTORY_UNIT } from './product.interface';

export interface BillOfMaterialsComponent {
  productId: string;
  productVariantId: string;
  quantity: number;
  inventoryUnit: INVENTORY_UNIT;
}

export interface BillOfMaterials {
  _id: string;
  productId: string;
  productVariantId: string;
  outputQuantity: number;
  outputUnit: INVENTORY_UNIT;
  components: BillOfMaterialsComponent[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BillOfMaterialsInput = Omit<BillOfMaterials, '_id' | 'createdAt' | 'updatedAt'>;
