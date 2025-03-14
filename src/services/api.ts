// src/services/api.ts
import { CategoryType } from '../components/AddItem/SizesQuantityForm';
import { getImageUrl, safeImageUrl } from '../utils/imageUtils';

export interface ImageFile extends File {
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

interface AddItemFormData {
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
}

// Interface for items received from backend
export interface Item {
  id: number;
  category: string;
  productName: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: string;
  images?: string[]; // Array of image filenames
  imageUrl?: string; // Changed from string | null to string | undefined
  
  // Add all the missing properties
  reference?: string;
  colorway?: string;
  size?: string;
  sizeSystem?: string;
  marketPrice?: number;
  shippingPrice?: number;
  purchaseLocation?: string;
  condition?: string;
  notes?: string;
  orderID?: string;
  tags?: string[];
  status?: 'unlisted' | 'listed' | 'sold';
}

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const api = {
  testConnection: async () => {
    try {
      console.log('🔄 Testing connection to API endpoint...');
      const response = await fetch(`${API_BASE_URL}/test`);
      if (!response.ok) {
        console.error(`❌ API test connection failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('✅ API connection test successful');
      return await response.json();
    } catch (error) {
      console.error('💥 Connection test failed:', error);
      throw error;
    }
  },

  addItem: async (formData: AddItemFormData, images: ImageFile[]) => {
    try {
      console.log('🔄 Preparing to add item...');
      // Create a FormData object for multipart request
      const multipartFormData = new FormData();
      
      // Add the JSON data as a string field named 'data'
      multipartFormData.append('data', JSON.stringify(formData));
      
      // Add all image files
      images.forEach((file, index) => {
        console.log(`📸 Adding image ${index + 1}/${images.length} to form data:`, file.name);
        multipartFormData.append('images', file);
      });
      
      console.log('📦 Submitting form data:', formData);
      console.log(`📊 Submitting ${images.length} images`);
      
      // Make the request
      console.log('🚀 Sending request to API...');
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        credentials: 'include',
        // Don't set Content-Type header, browser will set it automatically with boundary
        body: multipartFormData
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error response data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('💥 Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('✅ Item added successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('💥 Error in addItem:', error);
      throw error;
    }
  },

  // New method for updating an item
  updateItem: async (formData: any, images: ImageFile[]) => {
    try {
      console.log('🔄 Preparing to update item...');
      // Create a FormData object for multipart request
      const multipartFormData = new FormData();
      
      // Add the JSON data as a string field named 'data'
      multipartFormData.append('data', JSON.stringify(formData));
      
      // Add all image files if provided
      if (images && images.length > 0) {
        images.forEach((file, index) => {
          console.log(`📸 Adding image ${index + 1}/${images.length} to form data:`, file.name);
          multipartFormData.append('images', file);
        });
      }
      
      console.log('📦 Submitting update data:', formData);
      console.log(`📊 Submitting ${images?.length || 0} images`);
      
      // Make the request
      console.log('🚀 Sending update request to API...');
      const response = await fetch(`${API_BASE_URL}/items/${formData.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: multipartFormData
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error response data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('💥 Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('✅ Item updated successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('💥 Error in updateItem:', error);
      throw error;
    }
  },

  // New method for updating a single field
  updateItemField: async (itemId: number, field: string, value: any) => {
    try {
      console.log(`🔄 Updating ${field} for item ${itemId} to ${value}...`);
      
      const response = await fetch(`${API_BASE_URL}/items/${itemId}/field`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ field, value })
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error response data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('💥 Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log(`✅ Updated ${field} for item ${itemId} successfully:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`💥 Error updating ${field} for item ${itemId}:`, error);
      throw error;
    }
  },

  // New method for deleting an item
  deleteItem: async (itemId: number) => {
    try {
      console.log(`🔄 Deleting item ${itemId}...`);
      
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error response data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('💥 Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log(`✅ Item ${itemId} deleted successfully:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`💥 Error deleting item ${itemId}:`, error);
      throw error;
    }
  },

  getItems: async () => {
    try {
      console.log('🔄 Fetching items from API...');
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getItems failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const items = await response.json();
      console.log(`✅ Received ${items.length} items from API`);
      
      // Enhance items with image URLs for convenience
      const itemsWithImageUrls = items.map((item: Item) => {
        if (item.images && item.images.length > 0) {
          const imageUrl = getImageUrl(item.images[0], item.id);
          console.log(`🖼️ Item ${item.id}: Found image ${item.images[0]}, URL: ${imageUrl}`);
          return {
            ...item,
            imageUrl
          };
        }
        console.log(`⚠️ Item ${item.id}: No images found`);
        return item;
      });
      
      return itemsWithImageUrls;
    } catch (error) {
      console.error('💥 Error in getItems:', error);
      throw error;
    }
  },

  getItem: async (id: number) => {
    try {
      console.log(`🔄 Fetching item with ID ${id} from API...`);
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getItem failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const item = await response.json();
      console.log(`✅ Retrieved item ${id} details:`, item);
      
      // Add convenience property for image URL
      if (item.images && item.images.length > 0) {
        item.imageUrl = getImageUrl(item.images[0], id);
        console.log(`🖼️ Item ${id}: Primary image URL: ${item.imageUrl}`);
      } else {
        console.log(`⚠️ Item ${id}: No images available`);
      }
      
      return item;
    } catch (error) {
      console.error(`💥 Error fetching item ${id}:`, error);
      throw error;
    }
  },

  getItemImage: (filename: string): string => {
    if (!filename) {
      console.error('❌ Empty filename provided to getItemImage');
      return '/placeholder-image-svg.svg';
    }
    
    const imageUrl = safeImageUrl(API_BASE_URL, filename);
    console.log(`🖼️ getItemImage called for: ${filename}, URL: ${imageUrl}`);
    return imageUrl;
  },
  
  checkImageExists: async (filename: string): Promise<boolean> => {
    try {
      if (!filename) {
        console.error('❌ Empty filename provided to checkImageExists');
        return false;
      }
      
      console.log(`🔍 Checking if image exists: ${filename}`);
      const response = await fetch(`${API_BASE_URL}/check-image/${filename}`);
      
      if (!response.ok) {
        console.error(`❌ Image check endpoint returned ${response.status} for ${filename}`);
        return false;
      }
      
      const data = await response.json();
      console.log(`${data.exists ? '✅' : '❌'} Image check result for ${filename}:`, data);
      return data.exists || false;
    } catch (error) {
      console.error(`💥 Error checking image existence for ${filename}:`, error);
      return false;
    }
  },
  
  // Refresh item data after changes
  refreshItems: async () => {
    try {
      console.log('🔄 Refreshing items data...');
      const items = await api.getItems();
      console.log(`✅ Refreshed ${items.length} items`);
      return items;
    } catch (error) {
      console.error('💥 Error refreshing items:', error);
      throw error;
    }
  }
};

export type {
  AddItemFormData,
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  SizeEntry,
};