// src/utils/imageUtils.ts

/**
 * Utility functions for handling images
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Constructs a proper URL for an image stored on the server
 * 
 * @param filename The filename of the image
 * @param itemId Optional item ID for logging purposes
 * @param userId Optional user ID for path construction
 * @returns The full URL for the image, or undefined if no filename provided
 */
export const getImageUrl = (filename: string | undefined, itemId?: number, userId?: string): string | undefined => {
  if (!filename) {
    console.log(`❌ No image filename provided${itemId ? ` for item ${itemId}` : ''}`);
    return undefined;
  }
  
  // If the filename already contains a full URL, return it directly
  if (filename.startsWith('http')) {
    return filename;
  }
  
  // Clean the filename to remove any path separators at the beginning
  const cleanFilename = filename.replace(/^[\/\\]+/, '');
  
  let finalUrl;
  // Include the user ID in the path if provided
  if (userId) {
    // Ensure we don't double-add the user ID if it's already in the path
    if (cleanFilename.startsWith(userId + '/')) {
      finalUrl = `${API_BASE_URL}/uploads/${cleanFilename}`;
    } else {
      finalUrl = `${API_BASE_URL}/uploads/${userId}/${cleanFilename}`;
    }
  } else {
    // Fall back to the original path structure
    finalUrl = `${API_BASE_URL}/uploads/${cleanFilename}`;
  }
  
  return finalUrl;
};

/**
 * Checks if an image exists on the server
 * 
 * @param filename The filename to check
 * @returns Promise<boolean> indicating if the image exists
 */
/**
 * Checks if an image exists on the server for the authenticated user.
 * @param filename The filename to check
 * @param authToken The authentication token (required)
 * @returns Promise<boolean> indicating if the image exists
 */
export const checkImageExists = async (filename: string | undefined, authToken: string): Promise<boolean> => {
  if (!filename) {
    console.error('❌ Empty filename provided to checkImageExists');
    return false;
  }
  if (!authToken) {
    console.error('❌ Missing authToken in checkImageExists');
    return false;
  }
  
  try {
    console.log(`🔍 Checking if image exists: ${filename}`);
    const response = await fetch(`${API_BASE_URL}/check-image/${filename}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) {
      console.error(`❌ Image check failed with status ${response.status} for ${filename}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`${data.exists ? '✅' : '❌'} Image check result for ${filename}:`, data);
    return data.exists || false;
  } catch (error) {
    console.error(`💥 Error checking if image exists: ${filename}`, error);
    return false;
  }
};

/**
 * Preloads an image to check if it can be loaded successfully
 * 
 * @param url The URL of the image to preload
 * @returns Promise that resolves when image loads or rejects on error
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      console.error('❌ Empty URL provided to preloadImage');
      reject(new Error('Empty URL provided'));
      return;
    }

    console.log(`🔄 Preloading image: ${url}`);
    const img = new Image();
    
    img.onload = () => {
      console.log(`✅ Successfully preloaded image: ${url}`);
      resolve();
    };
    
    img.onerror = () => {
      console.error(`❌ Failed to preload image: ${url}`);
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = url;
  });
};

/**
 * Get a placeholder image URL based on category
 * 
 * @param category The item category
 * @returns URL for an appropriate placeholder image
 */
export const getCategoryPlaceholderImage = (category: string): string => {
  // You can create different placeholder images for different categories
  const placeholder = (() => {
    switch (category.toLowerCase()) {
      case 'sneakers':
        return '/placeholder-sneakers.svg';
      case 'watches':
        return '/placeholder-watches.svg';
      case 'handbags':
        return '/placeholder-handbags.svg';
      case 'streetwear':
        return '/placeholder-streetwear.svg';
      default:
        return '/placeholder-image-svg.svg';
    }
  })();
  
  return placeholder;
};

/**
 * Handle image load errors with detailed logging
 * 
 * @param error The error that occurred
 * @param imageUrl The URL that failed to load
 * @param itemId Optional item ID for context
 */
export const handleImageLoadError = (error: any, imageUrl?: string, itemId?: number): void => {
  const itemContext = itemId ? `for item ${itemId}` : '';
  const urlContext = imageUrl ? ` (URL: ${imageUrl})` : '';
  
  console.error(`❌ Image load error ${itemContext}${urlContext}:`, error);
  
  // You could implement additional error reporting here
  // For example, sending error logs to a service
};

/**
 * Safely build an image URL with error handling
 * 
 * @param baseUrl The base API URL
 * @param filename The image filename
 * @param fallbackUrl Optional fallback URL if filename is invalid
 * @returns A valid image URL or the fallback
 */
export const safeImageUrl = (
  baseUrl: string, 
  filename?: string, 
  fallbackUrl?: string
): string => {
  if (!filename) {
    console.warn('⚠️ No filename provided to safeImageUrl, using fallback');
    return fallbackUrl || '/placeholder-image-svg.svg';
  }
  
  try {
    const url = new URL(`uploads/${filename}`, baseUrl).toString();
    return url;
  } catch (error) {
    console.error(`💥 Error creating image URL for ${filename}:`, error);
    return fallbackUrl || '/placeholder-image-svg.svg';
  }
};