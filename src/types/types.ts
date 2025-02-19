// src/types/types.ts
import type { Dayjs } from 'dayjs';

export type CategoryType = 'Sneakers' | 'Streetwear' | 'Other';

// Fix: Ensure interfaces are exported without duplication
export interface ProductDetailsFormData {
  category: CategoryType;
  productName: string;
  reference: string;
  colorway: string;
  brand: string;
}

export interface SizeEntry {
  system: string;
  size: string;
  quantity: string;
}

export interface SizesQuantityData {
  sizeSystem: string;
  selectedSizes: SizeEntry[];
}

export interface PurchaseDetailsData {
  purchasePrice: number;
  purchaseCurrency: string;
  shippingPrice: number;
  shippingCurrency: string;
  marketPrice: number;
  purchaseDate: Dayjs | null;
  purchaseLocation: string;
  condition: string;
  notes: string;
  orderID: string;
  tags: string[];
  taxType: 'none' | 'vat' | 'salesTax';
  vatPercentage: number;
  salesTaxPercentage: number;
}

export interface ImageFile extends File {
  preview?: string;
  id?: string;
}

export interface AddItemPayload {
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
  images: string[];
}

export interface Item {
  id: number;
  category: string;
  productName: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: Dayjs | null;
  images?: string[];
}
