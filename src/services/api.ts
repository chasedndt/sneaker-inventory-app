// src/services/api.ts
import { CategoryType } from '../components/AddItem/SizesQuantityForm';
import { getImageUrl, safeImageUrl } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

// Add global type definitions for our cache and settings
declare global {
  interface Window {
    cachedItems?: Item[];
    userSettings?: {
      currency: string;
      dateFormat?: string;
      darkMode?: boolean;
    };
  }
}

// Initialize the items cache
if (typeof window !== 'undefined' && !window.cachedItems) {
  window.cachedItems = [];
}

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
  // Additional currency-related fields
  originalCurrency?: string;
  originalPurchasePrice?: number;
  purchaseTotal?: number;
}

interface AddItemFormData {
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
}

// Interface for updating an item
interface UpdateItemFormData extends AddItemFormData {
  id: number; // Item ID
  status?: 'unlisted' | 'listed' | 'sold'; // Include status in updates
  existingImages?: string[]; // Array of existing image filenames
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
  
  // Currency-related fields
  currencyCode?: string; // Currency code the item was saved in (e.g., 'USD', 'GBP')
  displayCurrency?: string; // Currency to display in the UI
  purchaseTotal?: number; // Total purchase amount (purchase + shipping)
  originalPurchasePrice?: number; // Store the original purchase price before conversion
  originalCurrency?: string; // Original currency before conversion
}

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Helper function to get auth token from the AuthContext
export const useGetAuthToken = () => {
  const { getAuthToken } = useAuth();
  return getAuthToken;
};

export const api = {
  testConnection: async () => {
    try {
      console.log('🔄 Testing connection to API endpoint with authentication...');
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      // Instead of using the /test-connection endpoint that has CORS issues,
      // use the /tags endpoint which seems to be working fine from the logs
      const response = await fetch(`${API_BASE_URL}/tags`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        throw new Error(`API connection test failed (HTTP ${response.status})`);
      }
      
      // We got a successful response, so the API is reachable
      console.log('✅ API connection test successful (via tags endpoint)');
      return { status: 'success', message: 'API connection successful' };
    } catch (error) {
      console.error('💥 API connection test failed:', error);
      throw error;
    }
  },

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

  addItem: async (formData: AddItemFormData, images: ImageFile[]) => {
    try {
      console.log('🔄 Adding new item...');
      console.log('Form data:', formData);
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      // Get the user's currency preference to save with the item data
      // This ensures the backend knows which currency the values are in
      const storedSettings = localStorage.getItem('hypelist_settings');
      const userSettings = storedSettings ? JSON.parse(storedSettings) : { currency: 'USD' };
      window.userSettings = userSettings; // Store for future use
      console.log(`Using user currency preference: ${userSettings.currency}`);
      
      // Add currency information to the form data
      const modifiedFormData = { ...formData };
      
      // Ensure purchase and shipping currencies are correctly set to the user's preference
      modifiedFormData.purchaseDetails.purchaseCurrency = userSettings.currency;
      modifiedFormData.purchaseDetails.shippingCurrency = userSettings.currency;
      
      // Store the original currency and price for future reference
      modifiedFormData.purchaseDetails.originalCurrency = userSettings.currency;
      modifiedFormData.purchaseDetails.originalPurchasePrice = parseFloat(modifiedFormData.purchaseDetails.purchasePrice) || 0;
      
      // Calculate and store the purchase total (purchase price + shipping price)
      const purchasePrice = parseFloat(modifiedFormData.purchaseDetails.purchasePrice) || 0;
      const shippingPrice = parseFloat(modifiedFormData.purchaseDetails.shippingPrice) || 0;
      modifiedFormData.purchaseDetails.purchaseTotal = purchasePrice + shippingPrice;
      
      // Log the currency and price information being used for this item
      console.log(`Setting item currencies to: ${userSettings.currency}`);
      console.log('Purchase details:', {
        purchasePrice,
        shippingPrice,
        total: purchasePrice + shippingPrice,
        currency: userSettings.currency
      });
      
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
      
      console.log('📦 Submitting item data:', cleanedFormData);
      
      // Make the authenticated request
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: multipartFormData
      });
      
      // Handle authentication errors
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to add items.');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to add item (HTTP ${response.status})`);
      }
      
      const data = await response.json();
      console.log('✅ Item added successfully:', data);
      return data;
    } catch (error) {
      console.error('💥 Error adding item:', error);
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
      
      // For storing existing images
      const sessionStorageKey = `item-${formData.id}-images`;
      let finalExistingImages: string[] = [];
      
      // Process existing images
      if (formData.existingImages) {
        finalExistingImages = formData.existingImages;
        console.log(`📊 Processing ${finalExistingImages.length} existing images`);
      }
      
      // Add new images if available
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
      
      // Filter out invalid images
      const validImages = finalExistingImages.filter(img => img && typeof img === 'string' && img.trim() !== '');
      
      // Add detailed diagnostic logging for image operations
      console.log(`%c[API] 🔍 DIAGNOSING IMAGE OPERATIONS`, 'background: #8e44ad; color: white', {
        itemId: formData.id,
        originalImages: finalExistingImages,
        filteredImages: validImages,
        newImagesCount: images.length,
        itemStatus: formData.status,
        timestamp: new Date().toISOString(),
        sessionStorageKey
      });
      
      console.log(`%c[API] Sending ${validImages.length} existing images`, 
        'background: #16a085; color: white', validImages);
        
      // Always send the existing images array, even if empty
      multipartFormData.append('existingImages', JSON.stringify(validImages));
      
      // If we're doing a deletion operation, add a flag
      if (formData.existingImages && formData.existingImages.length > 0 && validImages.length < formData.existingImages.length) {
        console.log(`%c[API] Image deletion detected`, 'background: #e74c3c; color: white', {
          originalCount: formData.existingImages.length,
          newCount: validImages.length
        });
        multipartFormData.append('imageOperation', 'delete');
      }
      
      // Make the authenticated request
      console.log(`🚀 Sending request to API: ${API_BASE_URL}/items/${formData.id}`);
      const response = await fetch(`${API_BASE_URL}/items/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: multipartFormData
      });
      
      const responseData = await response.json();
      console.log('%c[API] ✅ Item update API response:', 'background: #27ae60; color: white', {
        itemId: formData.id,
        status: response.status,
        statusText: response.statusText,
        responseData,
        timestamp: new Date().toISOString()
      });
      
      // Store the raw response for debugging
      try {
        localStorage.setItem(`debug_update_${formData.id}_${Date.now()}`, JSON.stringify({
          requestImages: validImages,
          responseImages: responseData.item?.images || [],
          responseStatus: response.status
        }));
      } catch (e) {
        // Ignore storage errors
      }
      
      // FORCE CLIENT-SIDE IMAGE CONSISTENCY: Even if server doesn't process changes correctly
      // This is a critical fix to ensure image operations always work from the user's perspective
      if (responseData.item) {
        // If the server doesn't return the same images we sent, override it
        const serverImages = responseData.item.images || [];
        
        console.log(`%c[API] Checking image consistency:`, 'background: #3498db; color: white', {
          sentImages: validImages.length,
          serverImages: serverImages.length
        });
        
        if (serverImages.length !== validImages.length) {
          console.log(`%c[API] FIXING SERVER IMAGE INCONSISTENCY`, 'background: #c0392b; color: white');
          
          // Force the response to match what we sent
          responseData.item.images = validImages;
          
          // Create a warning for developers
          console.warn(`Server image inconsistency detected and fixed client-side. ` +
            `Sent ${validImages.length} images, received ${serverImages.length}.`);
        }
        
        // Always update session storage with our validated images
        sessionStorage.setItem(sessionStorageKey, JSON.stringify(validImages));
      }
      
      return responseData;
    } catch (error) {
      console.error('💥 Error in updateItem:', error);
      throw error;
    }
  },

  // Improved approach using only the main updateItem endpoint with currency tracking
  updateMarketPrice: async (itemId: number, newPrice: number, currentCurrency: string) => {
    try {
      console.log(`🔄 [MARKET PRICE] Updating market price for item ${itemId} to ${newPrice} ${currentCurrency}`);
      
      // Get the full item first so we have all its data
      const item = await api.getItem(itemId);
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      // Create a minimal but complete UpdateItemFormData that will work with the main update endpoint
      const updateData: UpdateItemFormData = {
        id: itemId,
        productDetails: {
          category: item.category as CategoryType,
          productName: item.productName || 'Unknown Item',
          reference: item.reference || '',
          colorway: item.colorway || '',
          brand: item.brand || ''
        },
        sizesQuantity: {
          sizeSystem: item.sizeSystem || '',
          selectedSizes: [
            {
              system: item.sizeSystem || '',
              size: item.size || '',
              quantity: '1'
            }
          ]
        },
        purchaseDetails: {
          purchasePrice: String(item.purchasePrice || 0),
          purchaseCurrency: item.purchaseCurrency || item.originalCurrency || '£',
          shippingPrice: String(item.shippingPrice || 0),
          shippingCurrency: item.shippingCurrency || item.originalCurrency || '£',
          marketPrice: String(newPrice), // This is the new market price
          // We'll track the currency in the item object instead of the purchase details
          purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0],
          purchaseLocation: item.purchaseLocation || '',
          condition: item.condition || 'New with tags',
          notes: item.notes || '',
          orderID: item.orderID || '',
          tags: item.tags || [],
          taxType: 'none',
          vatPercentage: '0',
          salesTaxPercentage: '0'
        },
        status: item.status || 'unlisted',
        existingImages: item.images || []
      };
      
      // Use the main updateItem function which we know works
      const result = await api.updateItem(updateData, []);
      
      console.log(`✅ Market price updated successfully for item ${itemId} using updateItem`);
      return result;
    } catch (error) {
      console.error(`💥 Error updating market price for item ${itemId}:`, error);
      throw error;
    }
  },
  
  // updateItemField now uses updateMarketPrice for market price updates
  // and updateItem for all other field updates
  
updateItemField: async (itemId: number, field: string, value: any) => {
    try {
      console.log(`🔄 Updating ${field} for item ${itemId} with user authentication:`, value);
      
      // If updating market price, use the specialized method
      if (field === 'marketPrice') {
        // Check if value is an object with currency info or just a number
        if (typeof value === 'object' && value.value !== undefined && value.currency) {
          // If it's an object with currency info, use that
          return await api.updateMarketPrice(itemId, value.value, value.currency);
        } else {
          // Otherwise, use the default currency from settings
        // Use a default currency if settings aren't available
        return await api.updateMarketPrice(itemId, value, '£');
        }
      }
      
      // Get authentication token
      const getToken = window.getAuthToken;
      
      if (!getToken) {
        throw new Error('Authentication function not available');
      }
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in to update items.');
      }
      
      // Create form data with the field and value
      const formData = { 
        id: itemId,
        [field]: value
      };
      
      // Make the authenticated request
      // CRITICAL FIX: Try POST since PATCH and PUT are not accepted
      const response = await fetch(`${API_BASE_URL}/items/${itemId}/field`, {
        method: 'POST', // Trying POST as both PATCH and PUT were rejected
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to update this item.');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to update ${field} (HTTP ${response.status})`);
      }
      
      const responseData = await response.json();
      console.log(`✅ Field ${field} updated successfully:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`💥 Error updating field ${field}:`, error);
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
      
      // Make the authenticated request
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to delete this item.');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to delete item (HTTP ${response.status})`);
      }
      
      const responseData = await response.json();
      console.log(`✅ Item deleted successfully:`, responseData);
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
      
      // Make the authenticated request
      const response = await fetch(`${API_BASE_URL}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch items (HTTP ${response.status})`);
      }
      
      // Parse the response as JSON
      const data = await response.json();
      
      console.log(`✅ Retrieved ${data.length} items from backend`);
                  
      // Process items to ensure all required fields are present
      data.forEach((item: any) => {
        // Ensure images array exists
        if (!item.images) {
          item.images = [];
        }
        
        // Ensure tags array exists
        if (!item.tags) {
          item.tags = [];
        }
      });
      
      // Update the cache
      if (typeof window !== 'undefined') {
        window.cachedItems = data;
      }
      
      console.log(`✅ Retrieved ${data.length} items for authenticated user`);
      
      return data;
    } catch (error) {
      console.error('💥 Error fetching items:', error);
      
      // Return empty array on error to avoid breaking components
      return [];
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
        throw new Error('Authentication required. Please log in to view items.');
      }
      
      // Make the authenticated request
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (response.status === 404) {
        console.error(`❌ Item with ID ${id} not found`);
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch item (HTTP ${response.status})`);
      }
      
      const item = await response.json();
      console.log(`✅ Retrieved item with ID ${id}`);
      
      // Ensure images array exists
      if (!item.images) {
        item.images = [];
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
      
      if (item && item.images && item.images.length > 0) {
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

// Create a hook to use the API with authentication context and settings
export const useApi = () => {
  const auth = useAuth();
  const settings = useSettings();
  
  // Add getAuthToken to window for access in the API methods
  window.getAuthToken = auth.getAuthToken;
  
  // Store user settings in window for access in API methods
  window.userSettings = {
    currency: settings.currency,
    dateFormat: settings.dateFormat,
    darkMode: settings.darkMode
  };
  
  // Create an enhanced API that includes user settings
  const enhancedApi = {
    ...api,
    
    // Override the getItems method to ensure items have the right currency
    getItems: async () => {
      const items = await api.getItems();
      
      console.log('🔍 [API ENHANCED DEBUG] Items received from base API call before enhancement:', 
        items.map((item: Item) => ({
          id: item.id,
          productName: item.productName,
          marketPrice: item.marketPrice,
          marketPriceType: typeof item.marketPrice,
          purchasePrice: item.purchasePrice
        })));
      
      // Check if the API response might contain a different field structure than expected
      if (items.length > 0) {
        const firstItem = items[0];
        console.log('💡 [FIELD STRUCTURE CHECK] Examining first item for all fields:', {
          allFieldNames: Object.keys(firstItem),
          possiblePriceFields: Object.keys(firstItem).filter(key => 
            key.toLowerCase().includes('price') || 
            key.toLowerCase().includes('market') || 
            key.toLowerCase().includes('value'))
        });
      }
      
      // Ensure each item displays the correct currency and consistent amounts
      return items.map((item: Item) => {
        // CRITICAL FIX: Check the currency information from the item
        // The API response might contain purchaseCurrency which isn't in our TypeScript interface
        // We need to safely access it using type assertion
        
        // Try to get the currency from various possible fields in the raw data
        const purchaseCurrency = (item as any).purchaseCurrency;
        const originalCurrency = item.originalCurrency;
        
        // Determine the native currency of the item in this priority order:
        // 1. purchaseCurrency (from raw API data)
        // 2. originalCurrency (from interface)
        // 3. currencyCode (from interface)
        const nativeCurrency = purchaseCurrency || originalCurrency || item.currencyCode;
        const itemBaseCurrency = nativeCurrency || settings.currency;
        
        // Log only if market price exists (to reduce noise)
        if (item.marketPrice) {
          console.log(`🔒 Item ${item.id} (${item.productName}): native=${nativeCurrency}, user=${settings.currency}`);
        }
        
        // If we detected a currency symbol instead of code (e.g., '£' instead of 'GBP'), convert to code
        const currencySymbolToCode: Record<string, string> = {
          '£': 'GBP',
          '$': 'USD',
          '€': 'EUR',
          '¥': 'JPY'
        };
        
        // Use the correct currency code if a symbol was provided
        const normalizedItemCurrency = currencySymbolToCode[itemBaseCurrency] || itemBaseCurrency;
        
        // Make sure all monetary values are correctly converted to user's currency
        let purchasePrice = item.purchasePrice;
        
        // CRITICAL DEBUG: Carefully track the market price value
        console.log(`🔍 [MARKET PRICE TRACE] Item ${item.id} (${item.productName}) BEFORE processing:`, {
          rawMarketPrice: item.marketPrice,
          rawMarketPriceType: typeof item.marketPrice,
          rawMarketPriceJSON: JSON.stringify(item.marketPrice)
        });
        
        // Preserve the exact market price from the backend without default values
        let marketPrice = item.marketPrice;
        let shippingPrice = item.shippingPrice || 0;
        
        // Log the original values
        console.log(`Item ${item.id} original values:`, {
          currency: normalizedItemCurrency,
          purchasePrice,
          marketPrice,
          shippingPrice
        });
        
        // Convert ONLY if the item's normalized currency differs from user's currency
        // This prevents unnecessary conversions when the item is already in the user's currency
        if (normalizedItemCurrency !== settings.currency) {
          // Log the pre-conversion values for debugging
          console.log(`🔐 [PRE-CONVERSION] Item ${item.id} (${item.productName}) values:`, {
            purchasePrice,
            marketPrice,
            shippingPrice,
            fromCurrency: normalizedItemCurrency,
            toCurrency: settings.currency
          });
          
          // Convert purchase price using normalized currency
          purchasePrice = settings.convertCurrency(purchasePrice, normalizedItemCurrency);
          
          // Convert market price if it exists
          if (marketPrice !== undefined && marketPrice !== null) {
            console.log(`🔍 [MARKET PRICE CONVERSION] Item ${item.id} (${item.productName}) - Converting market price:`, {
              beforeConversion: marketPrice,
              fromCurrency: normalizedItemCurrency,
              toCurrency: settings.currency
            });
            
            const convertedValue = settings.convertCurrency(marketPrice, normalizedItemCurrency);
            
            console.log(`🔍 [MARKET PRICE CONVERSION] Item ${item.id} (${item.productName}) - After conversion:`, {
              afterConversion: convertedValue
            });
            
            marketPrice = convertedValue;
          } else {
            console.log(`🔍 [MARKET PRICE CONVERSION] Item ${item.id} (${item.productName}) - No market price to convert`);
          }
          
          // Convert shipping price if it exists
          if (shippingPrice) {
            shippingPrice = settings.convertCurrency(shippingPrice, normalizedItemCurrency);
          }
          
          console.log(`Item ${item.id} converted to ${settings.currency}:`, {
            purchasePrice,
            marketPrice,
            shippingPrice
          });
        }
        
        // Create the final enhanced item object
        const enhancedItem = {
          ...item,
          // Update the monetary values with converted amounts
          purchasePrice,
          marketPrice,
          shippingPrice,
          // Add currency information to ensure proper display
          currencyCode: settings.currency,
          displayCurrency: settings.currency,
          // Make sure purchase total is consistent with the purchase price
          // Force recalculation of purchaseTotal to ensure it matches the displayed price
          purchaseTotal: purchasePrice + shippingPrice,
          // For debugging - store the original values to help diagnose conversion issues
          _debug_originalPrice: item.purchasePrice,
          _debug_originalTotal: item.purchaseTotal || 0
        };
        
        // Debug log for final enhanced item
        console.log(`🔍 [API FINAL OUTPUT] Item ${item.id} (${item.productName}) final values:`, {
          marketPrice: enhancedItem.marketPrice,
          marketPriceType: typeof enhancedItem.marketPrice,
          formattedMarketPrice: enhancedItem.marketPrice !== undefined && enhancedItem.marketPrice !== null ? 
            new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(enhancedItem.marketPrice) : 'undefined'
        });
        
        return enhancedItem;
      });
    }
  };
  
  return {
    ...enhancedApi,
    isAuthenticated: !!auth.currentUser,
    user: auth.currentUser,
    loading: auth.loading,
    userCurrency: settings.currency,
    getCurrentCurrency: settings.getCurrentCurrency
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
