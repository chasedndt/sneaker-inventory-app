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
  purchaseDate: string | null;  // Updated type
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
  images: any[];
}

// New interface for items received from backend
export interface Item {
  id: number;
  category: string;
  productName: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: string;
  images?: string[];
}

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const api = {
  testConnection: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/test`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  },

  addItem: async (payload: AddItemPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response data:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in addItem:', error);
      throw error;
    }
  },

  uploadImages: async (files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw error;
    }
  },

  getItems: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in getItems:', error);
      throw error;
    }
  },

  getItemImage: (filename: string) => {
    return `${API_BASE_URL}/uploads/${filename}`;
  }
};

export type {
  AddItemPayload,
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  ImageFile,
  SizeEntry,
};
