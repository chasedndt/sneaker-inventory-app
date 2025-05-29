// src/services/api-helpers.ts
// This file contains helper functions to extend the API capabilities

import { CategoryType } from '../components/AddItem/SizesQuantityForm';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

// Define types for API operations
export interface ImageFile extends File {
  preview?: string;
  id?: string;
  uri?: string;
}

export interface PurchaseDetailsData {
  purchasePrice: string;
  purchaseCurrency: string;
  shippingPrice: string;
  shippingCurrency: string;
  marketPrice: string;
  marketPriceCurrency?: string; // Added this to support market price currency tracking
  purchaseDate: string;
  purchaseLocation: string;
  condition: string;
  notes: string;
  orderID: string;
  tags: string[];
  taxType: string;
  vatPercentage: string;
  salesTaxPercentage: string;
}

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

export interface AddItemFormData {
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
  status: string;
}

export interface UpdateItemFormData extends Omit<AddItemFormData, 'status'> {
  id: number;
  status?: 'unlisted' | 'listed' | 'sold';
  existingImages?: string[];
}

export interface Item {
  id: number;
  productName: string;
  reference: string;
  colorway: string;
  category: string;
  brand: string;
  purchasePrice: number;
  marketPrice: number;
  marketPriceCurrency?: string; // Added to track the currency of market prices
  size: string;
  sizeSystem: string;
  purchaseDate: string;
  purchaseLocation: string;
  condition: string;
  status: string;
  shippingPrice: number;
  images: string[];
  notes: string;
  orderID: string;
  tags: string[];
  originalCurrency?: string;
  purchaseCurrency?: string;
  shippingCurrency?: string;
  currencyCode?: string;
  estimatedProfit?: number;
  roi?: number;
  purchaseTotal?: number;
}

// Helper functions for API operations

// Get items with authentication
export async function getItems() {
  try {
    console.log('🔄 Fetching items with user authentication...');
    
    // Get authentication token from window global
    const getToken = window.getAuthToken;
    
    if (!getToken) {
      throw new Error('Authentication function not available');
    }
    
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in to get items.');
    }
    
    const response = await fetch(`${API_BASE_URL}/items`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get items: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

// Get a single item with authentication
export async function getItem(id: number) {
  try {
    console.log(`🔄 Fetching item ${id} with user authentication...`);
    
    // Get authentication token
    const getToken = window.getAuthToken;
    
    if (!getToken) {
      throw new Error('Authentication function not available');
    }
    
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in to get an item.');
    }
    
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get item: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.item;
  } catch (error) {
    console.error(`Error fetching item ${id}:`, error);
    throw error;
  }
}

// Update a specific field of an item
export async function updateItemField(itemId: number, fieldName: string, value: any) {
  try {
    console.log(`🔄 Updating field ${fieldName} for item ${itemId}...`);
    
    // Get authentication token
    const getToken = window.getAuthToken;
    
    if (!getToken) {
      throw new Error('Authentication function not available');
    }
    
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in to update an item.');
    }
    
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/fields`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ field: fieldName, value })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update field: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating field for item ${itemId}:`, error);
    throw error;
  }
}

// Delete an item with authentication
export async function deleteItem(itemId: number) {
  try {
    console.log(`🔄 Deleting item ${itemId} with user authentication...`);
    
    // Get authentication token
    const getToken = window.getAuthToken;
    
    if (!getToken) {
      throw new Error('Authentication function not available');
    }
    
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in to delete an item.');
    }
    
    const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete item: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting item ${itemId}:`, error);
    throw error;
  }
}

// Update market price with currency tracking
export async function updateMarketPrice(itemId: number, newPrice: number, currentCurrency: string) {
  try {
    console.log(`🔄 [MARKET PRICE UPDATE] Updating market price for item ${itemId} to ${newPrice} ${currentCurrency}`);
    
    // We'll use the updateItemField function to update the market price with currency tracking
    return updateItemField(itemId, 'marketPrice', { value: newPrice, currency: currentCurrency });
  } catch (error) {
    console.error(`Error updating market price for item ${itemId}:`, error);
    throw error;
  }
}

// Helper for global type definition
declare global {
  interface Window {
    getAuthToken: (() => Promise<string | null>) | undefined;
    // Removed cachedItems and userSettings as they're already declared in api.ts
  }
}
