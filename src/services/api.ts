// src/services/api.ts
import { CategoryType } from '../components/AddItem/SizesQuantityForm';
import { Dayjs } from 'dayjs';

interface ImageFile extends File {
  preview?: string;
  id?: string;
}

interface ProductDetailsFormData {
  category: CategoryType;
  productName: string;
  reference: string;
  colorway: string;
  brand: string;
}

interface SizeEntry {
  system: string;
  size: string;
  quantity: string;
}

interface SizesQuantityData {
  sizeSystem: string;
  selectedSizes: SizeEntry[];
}

interface PurchaseDetailsData {
  purchasePrice: string;
  purchaseCurrency: string;
  shippingPrice: string;
  shippingCurrency: string;
  marketPrice: string;
  purchaseDate: Dayjs | null;
  purchaseLocation: string;
  condition: string;
  notes: string;
  orderID: string;
  tags: string[];
  taxType: 'none' | 'vat' | 'salesTax';
  vatPercentage: string;
  salesTaxPercentage: string;
}

interface AddItemPayload {
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
  images: ImageFile[];
}

// API endpoints
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

export const api = {
  addItem: async (payload: AddItemPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  uploadImages: async (files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  },
};

export type {
  AddItemPayload,
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  ImageFile,
  SizeEntry,
};
