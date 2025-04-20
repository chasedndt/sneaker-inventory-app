// src/services/api.ts
import { CategoryType } from '../components/AddItem/SizesQuantityForm';
import { getImageUrl, safeImageUrl } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';

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

// Interface for updating an item
interface UpdateItemFormData {
  id?: number; // Item ID
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
  status?: 'unlisted' | 'listed' | 'sold'; // Include status in updates
}

// Listing interface for item listings
export interface Listing {
  id?: string;
  platform: string;
  price: number;
  url?: string;
  date: string;
  status: 'active' | 'sold' | 'expired';
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
  listings?: Listing[];
  status?: 'unlisted' | 'listed' | 'sold';
  user_id?: string; // Add user_id field for user-specific data filtering
}

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Helper function to get auth token from the AuthContext
export const useGetAuthToken = () => {
  const { getAuthToken } = useAuth();
  return getAuthToken;
};

export const api = {
  // Helper function to make authenticated requests
  authenticatedFetch: async (url: string, options: RequestInit = {}) => {
    // We need to get the auth context directly in this function
    // This is a bit of a workaround since we can't use hooks directly in this object
    const getToken = window.getAuthToken;
    
    if (!getToken) {
      throw new Error('Authentication function not available. Are you using this outside of the AuthProvider?');
    }
    
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Handle authentication errors
    if (response.status === 401) {
      throw new Error('Authentication expired or invalid. Please log in again.');
    }
    
    if (response.status === 403) {
      throw new Error('You do not have permission to access this resource.');
    }
    
    return response;
  },

  testConnection: async () => {
    try {
      console.log('🔄 Testing connection to API endpoint with authentication...');
      
      // We need to get the auth context here
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_BASE_URL}/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error(`❌ API test connection failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('✅ API connection test successful with authentication');
      return await response.json();
    } catch (error) {
      console.error('💥 Connection test failed:', error);
      throw error;
    }
  },

  addItem: async (formData: AddItemFormData, images: ImageFile[]) => {
    try {
      console.log('🔄 Preparing to add item with user authentication...');
      
      // Get authentication token from the window object
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to add items.');
      }
      
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
      
      // Make the authenticated request
      console.log('🚀 Sending authenticated request to API...');
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: multipartFormData
      });
      
      if (!response.ok) {
        // Handle authentication-specific errors
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('You do not have permission to add items.');
        }
        
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

  updateItem: async (formData: UpdateItemFormData, images: ImageFile[]) => {
    try {
      if (!formData.id) {
        throw new Error('Item ID is required for update');
      }
      
      console.log(`🔄 Preparing to update item ${formData.id} with user authentication...`);
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to update items.');
      }
      
      // Create a FormData object for multipart request
      const multipartFormData = new FormData();
      
      // Clean up empty strings that should be null or zero in numeric fields
      const cleanedFormData = {
        ...formData,
        purchaseDetails: {
          ...formData.purchaseDetails,
          // Convert empty strings to '0' for number fields
          shippingPrice: formData.purchaseDetails.shippingPrice === '' ? '0' : formData.purchaseDetails.shippingPrice,
          marketPrice: formData.purchaseDetails.marketPrice === '' ? '0' : formData.purchaseDetails.marketPrice,
          vatPercentage: formData.purchaseDetails.vatPercentage === '' ? '0' : formData.purchaseDetails.vatPercentage,
          salesTaxPercentage: formData.purchaseDetails.salesTaxPercentage === '' ? '0' : formData.purchaseDetails.salesTaxPercentage
        }
      };
      
      // Add the JSON data as a string field named 'data'
      multipartFormData.append('data', JSON.stringify(cleanedFormData));
      
      // Add all image files if provided
      if (images && images.length > 0) {
        images.forEach((file, index) => {
          // Check if file is a valid File object (not just a reference to an existing file)
          if (file instanceof File) {
            console.log(`📸 Adding image ${index + 1}/${images.length} to form data:`, file.name);
            multipartFormData.append('images', file);
          } else {
            console.warn(`⚠️ Skipping invalid image at index ${index} - not a valid File object`);
          }
        });
      }
      
      console.log('📦 Submitting update data:', cleanedFormData);
      console.log(`📊 Submitting ${images?.length || 0} images`);
      
      // Make the authenticated request
      console.log(`🚀 Sending authenticated PUT request to API: ${API_BASE_URL}/items/${formData.id}`);
      const response = await fetch(`${API_BASE_URL}/items/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: multipartFormData
      });
      
      // Handle response
      if (!response.ok) {
        // Handle authentication-specific errors
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('You do not have permission to update this item.');
        }
        
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

  updateItemField: async (itemId: number, field: string, value: any) => {
    try {
      console.log(`🔄 Updating ${field} for item ${itemId} with user authentication:`, JSON.stringify(value, null, 2));
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to update items.');
      }
      
      // Special handling for tags to ensure proper format
      if (field === 'tags') {
        // Make sure tags is an array
        if (!Array.isArray(value)) {
          console.error('Tags value must be an array, received:', typeof value, value);
          throw new Error('Tags value must be an array');
        }
        
        // Convert all tag IDs to strings if they aren't already
        value = value.map(tagId => String(tagId));
        
        // Log the tags being updated
        console.log(`🏷️ Updating tags for item ${itemId}:`, value);
      }
      
      // Special handling for listings to ensure proper format
      if (field === 'listings') {
        // Make sure listings is an array
        if (!Array.isArray(value)) {
          console.error('Listings value must be an array, received:', typeof value, value);
          throw new Error('Listings value must be an array');
        }
        
        // Ensure all dates are in ISO string format
        value = value.map(listing => ({
          ...listing,
          date: typeof listing.date === 'object' && listing.date.toISOString 
            ? listing.date.toISOString() 
            : listing.date
        }));
        
        // Log the listings being updated
        console.log(`📋 Updating listings for item ${itemId}:`, value);
      }

      // Special handling for numeric fields to prevent empty string errors
      if (field === 'marketPrice' || field === 'shippingPrice') {
        // Convert empty string to 0 
        if (value === '') {
          value = 0;
          console.log(`⚠️ Converting empty string to 0 for ${field}`);
        }
      }
      
      // Prepare the update data
      const updateData = {
        field,
        value
      };
      
      console.log('📦 Submitting field update:', JSON.stringify(updateData, null, 2));
      
      // Make the PATCH request
      console.log(`🚀 Sending authenticated PATCH request to API: ${API_BASE_URL}/items/${itemId}/field`);
      
      const response = await fetch(`${API_BASE_URL}/items/${itemId}/field`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      // Log the response status
      console.log(`🔍 PATCH response status: ${response.status}`);
      
      // Handle authentication-specific errors
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to update this item.');
      }
      
      // Try to get the response text or JSON for more info
      let responseText;
      try {
        responseText = await response.text();
        console.log(`🔍 PATCH response text:`, responseText);
      } catch (textError) {
        console.error('Failed to get response text:', textError);
      }
      
      if (response.ok) {
        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : { message: 'Update successful' };
        } catch (jsonError) {
          console.warn('Response is not valid JSON:', responseText);
          responseData = { message: 'Update successful but response is not JSON' };
        }
        
        console.log(`✅ Updated ${field} for item ${itemId} successfully:`, responseData);
        return responseData;
      }
      
      throw new Error(`HTTP error! status: ${response.status}, message: ${responseText || 'Unknown error'}`);
    } catch (error) {
      console.error(`💥 Error updating ${field} for item ${itemId}:`, error);
      throw error;
    }
  },

  deleteItem: async (itemId: number) => {
    try {
      console.log(`🔄 Deleting item ${itemId} with user authentication...`);
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to delete items.');
      }
      
      // Now proceed with deleting the item with authentication
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle authentication-specific errors
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to delete this item.');
      }
      
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
      console.log('🔄 Fetching items from API with user authentication...');
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to view items.');
      }
      
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle authentication-specific errors
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to access these items.');
      }
      
      if (!response.ok) {
        console.error(`❌ API getItems failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const items = await response.json();
      console.log(`✅ Received ${items.length} items from API for authenticated user`);
      
      // Enhance items with image URLs for convenience
      const itemsWithImageUrls = items.map((item: Item) => {
        const enhancedItem = { ...item };

        // Handle image URLs
        if (item.images && item.images.length > 0) {
          const imageUrl = getImageUrl(item.images[0], item.id);
          console.log(`🖼️ Item ${item.id}: Found image ${item.images[0]}, URL: ${imageUrl}`);
          enhancedItem.imageUrl = imageUrl;
        } else {
          console.log(`⚠️ Item ${item.id}: No images found`);
        }

        // Ensure tags array exists
        if (!enhancedItem.tags) {
          enhancedItem.tags = [];
        } else {
          // Ensure all tag IDs are strings
          enhancedItem.tags = enhancedItem.tags.map(String);
        }

        // Ensure listings array exists and format dates properly
        if (enhancedItem.listings && Array.isArray(enhancedItem.listings)) {
          enhancedItem.listings = enhancedItem.listings.map(listing => ({
            ...listing,
            // Ensure date is in the correct format
            date: listing.date || new Date().toISOString()
          }));
        } else {
          enhancedItem.listings = [];
        }
        
        return enhancedItem;
      });
      
      return itemsWithImageUrls;
    } catch (error) {
      console.error('💥 Error in getItems:', error);
      throw error;
    }
  },

  getItem: async (id: number) => {
    try {
      console.log(`🔄 Fetching item with ID ${id} from API with user authentication...`);
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to view this item.');
      }
      
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle authentication-specific errors
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to access this item.');
      }
      
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
      
      // Ensure tags array exists
      if (!item.tags) {
        item.tags = [];
      } else {
        // Make sure all tag IDs are strings
        item.tags = item.tags.map(String);
      }

      // Ensure listings array exists
      if (!item.listings) {
        item.listings = [];
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
      return '/placeholder-image.svg';
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
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      console.log(`🔍 Checking if image exists with authentication: ${filename}`);
      const response = await fetch(`${API_BASE_URL}/check-image/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle authentication-specific errors
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
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
  
  // Get all images for an item with authentication
  getItemImages: async (itemId: number): Promise<string[]> => {
    try {
      console.log(`🔄 Fetching images for item ${itemId} with user authentication...`);
      
      // Use the authenticated getItem method
      const item = await api.getItem(itemId);
      
      if (item.images && item.images.length > 0) {
        console.log(`✅ Retrieved ${item.images.length} images for item ${itemId}`);
        return item.images;
      }
      
      console.log(`⚠️ No images found for item ${itemId}`);
      return [];
    } catch (error) {
      console.error(`💥 Error fetching images for item ${itemId}:`, error);
      return [];
    }
  },
  
  // Refresh item data after changes with authentication
  refreshItems: async () => {
    try {
      console.log('🔄 Refreshing items data with user authentication...');
      const items = await api.getItems();
      console.log(`✅ Refreshed ${items.length} items for authenticated user`);
      return items;
    } catch (error) {
      console.error('💥 Error refreshing items:', error);
      throw error;
    }
  }
};

// Create a hook to use the API with authentication context
export const useApi = () => {
  const auth = useAuth();
  
  // Add getAuthToken to window for access in the API methods
  window.getAuthToken = auth.getAuthToken;
  
  return {
    ...api,
    isAuthenticated: !!auth.currentUser,
    user: auth.currentUser,
    loading: auth.loading
  };
};

// Declare global window type to include our auth function
declare global {
  interface Window {
    getAuthToken: (() => Promise<string | null>) | undefined;
  }
}

export type {
  AddItemFormData,
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  SizeEntry,
  UpdateItemFormData,
};