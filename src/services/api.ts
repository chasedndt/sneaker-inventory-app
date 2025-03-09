// src/services/api.ts - with detailed error logging
import { CategoryType } from '../components/AddItem/SizesQuantityForm';

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

interface AddItemFormData {
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
}

// New interface for items received from backend
export interface Item {
  id: number;
  category: string;
  productName: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: string;
  images?: string[]; // Array of image filenames
}

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Helper function to construct proper image URLs with enhanced logging
export const getItemImageUrl = (filename: string | undefined, itemId?: number): string | null => {
  if (!filename) {
    console.log(`No image filename provided for item ${itemId || 'unknown'}`);
    return null;
  }
  
  // Try console logging the API endpoint to help debugging
  const imageUrl = `${API_BASE_URL}/uploads/${filename}`;
  console.log(`Item ${itemId || 'unknown'}: Constructed image URL: ${imageUrl} for filename: ${filename}`);
  
  // Try to fetch the image URL to see if it resolves
  fetch(imageUrl, { method: 'HEAD' })
    .then(response => {
      console.log(`Image URL check for ${filename}: ${response.status} ${response.statusText}`);
    })
    .catch(error => {
      console.error(`Image URL fetch error for ${filename}:`, error);
    });
  
  return imageUrl;
};

export const api = {
  testConnection: async () => {
    try {
      console.log('Testing connection to API endpoint...');
      const response = await fetch(`${API_BASE_URL}/test`);
      if (!response.ok) {
        console.error(`API test connection failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('API connection test successful');
      return await response.json();
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  },

  addItem: async (formData: AddItemFormData, images: ImageFile[]) => {
    try {
      console.log('Preparing to add item...');
      // Create a FormData object for multipart request
      const multipartFormData = new FormData();
      
      // Add the JSON data as a string field named 'data'
      multipartFormData.append('data', JSON.stringify(formData));
      
      // Add all image files
      images.forEach((file, index) => {
        console.log(`Adding image ${index + 1}/${images.length} to form data:`, file.name);
        multipartFormData.append('images', file);
      });
      
      console.log('Submitting form data:', formData);
      console.log('Submitting images:', images.length);
      
      // Make the request
      console.log('Sending request to API...');
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        credentials: 'include',
        // Don't set Content-Type header, browser will set it automatically with boundary
        body: multipartFormData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response data:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Item added successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error in addItem:', error);
      throw error;
    }
  },

  getItems: async () => {
    try {
      console.log('Fetching items from API...');
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`API getItems failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const items = await response.json();
      console.log('Items received from API:', items.length);
      
      // Log detailed information about the images in the response
      items.forEach((item: any, index: number) => {
        console.log(`Item ${index} (${item.id}): ${item.productName}`);
        if (item.images && Array.isArray(item.images)) {
          console.log(`  - Has ${item.images.length} images: ${JSON.stringify(item.images)}`);
          item.images.forEach((img: string, imgIndex: number) => {
            const imgUrl = `${API_BASE_URL}/uploads/${img}`;
            console.log(`    Image ${imgIndex}: ${img} -> ${imgUrl}`);
            
            // Check if image URL is valid
            fetch(imgUrl, { method: 'HEAD' })
              .then(imgResponse => {
                console.log(`    Image URL status: ${imgResponse.status} ${imgResponse.statusText}`);
              })
              .catch(imgError => {
                console.error(`    Image URL error:`, imgError);
              });
          });
        } else {
          console.log(`  - No images or invalid image data: ${JSON.stringify(item.images)}`);
        }
      });
      
      return items;
    } catch (error) {
      console.error('Error in getItems:', error);
      throw error;
    }
  },

  getItemImage: (filename: string): string => {
    // Log the image URL being requested
    const imageUrl = `${API_BASE_URL}/uploads/${filename}`;
    console.log(`getItemImage called for: ${filename}, URL: ${imageUrl}`);
    return imageUrl;
  },
  
  checkImageExists: async (filename: string): Promise<boolean> => {
    try {
      console.log(`Checking if image exists: ${filename}`);
      const response = await fetch(`${API_BASE_URL}/check-image/${filename}`);
      const data = await response.json();
      
      console.log(`Image check result:`, data);
      return data.exists || false;
    } catch (error) {
      console.error(`Error checking image existence for ${filename}:`, error);
      return false;
    }
  }
};

export type {
  AddItemFormData,
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  ImageFile,
  SizeEntry,
};