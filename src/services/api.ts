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

const API_BASE_URL = 'http://127.0.0.1:5000/api';
console.log('Using API URL:', API_BASE_URL);

export const api = {
  testConnection: async () => {
    try {
      console.log('Testing API connection to:', `${API_BASE_URL}/test`);
      const response = await fetch(`${API_BASE_URL}/test`);
      console.log('Test connection response:', response);
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
    console.log('Starting addItem request with payload:', payload);
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          purchaseDetails: {
            ...payload.purchaseDetails,
            purchaseDate: payload.purchaseDetails.purchaseDate?.toISOString() || null
          }
        })
      });
      
      console.log('Received addItem response:', response);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response data:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AddItem success response:', data);
      return data;
    } catch (error) {
      console.error('Error in addItem:', error);
      throw error;
    }
  },

  uploadImages: async (files: File[]) => {
    console.log('Starting uploadImages with files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.type, file.size);
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      console.log('Received upload response:', response);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Upload error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload success response:', data);
      return data;
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw error;
    }
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
