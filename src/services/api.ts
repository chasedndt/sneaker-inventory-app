// src/services/api.ts
import type { Dayjs } from 'dayjs';
import {
  AddItemPayload,
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  ImageFile
} from '../types/types';
import dayjs from 'dayjs';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

interface ApiItemPayload extends Omit<AddItemPayload, 'purchaseDetails'> {
  purchaseDetails: Omit<PurchaseDetailsData, 'purchaseDate'> & {
    purchaseDate: string | null;
  };
}

interface ApiPurchaseDetails extends Omit<PurchaseDetailsData, 'purchaseDate'> {
  purchaseDate: string | null;
}

export interface Item {
  id: number;
  category: string;
  productName: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: Dayjs | null;
  images?: string[];
  sizesQuantity?: Array<{ size: string; quantity: number }>;
}

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

  addItem: async (payload: Omit<AddItemPayload, 'purchaseDetails'> & {
    purchaseDetails: ApiPurchaseDetails
  }): Promise<{ id: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response data:', errorData);
        const errorMsg = errorData?.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return { id: data.id };
    } catch (error) {
      console.error('Error in addItem:', error);
      throw error;
    }
  },

  uploadImages: async (itemId: string, files: File[]): Promise<string[]> => {
    try {
      if (files.length === 0) {
        console.log('No images to upload.');
        return [];
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      formData.append('item_id', itemId);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response data:', errorData);
        const errorMsg = errorData?.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.uploaded_files;
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw error;
    }
  },

  getItems: async (): Promise<Item[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`);
      const data = await response.json();
      
      // Convert date strings to Dayjs objects
      return data.map((item: any) => ({
        ...item,
        purchaseDate: item.purchaseDate ? dayjs(item.purchaseDate) : null
      }));
    } catch (error) {
      console.error('Error in getItems:', error);
      throw error;
    }
  },

  getItemImage: (filename: string) => {
    console.log('Constructing image URL for:', filename);
    const url = `${API_BASE_URL}/uploads/${filename}`;
    console.log('Final URL:', url);
    return url;
  },
};
