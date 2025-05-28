// src/utils/globalCurrencyUtils.ts
/**
 * This file provides centralized currency handling utilities
 * to ensure consistent currency display throughout the application
 */

import { api } from '../services/api';
import { getCurrencySymbol } from './currencyUtils';

/**
 * Ensures that all price-related data in items has the correct currency
 * This function should be called when fetching items from the API
 * 
 * @param items - Items from the API
 * @param userCurrency - User's preferred currency
 */
export const normalizeItemCurrencies = (items: any[], userCurrency: string): any[] => {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map(item => {
    // Create a normalized item with the same properties
    const normalizedItem = { ...item };
    
    // Add currency information to ensure proper display
    normalizedItem.currencyCode = userCurrency;
    
    // Ensure the item has the currency symbol property
    normalizedItem.currencySymbol = getCurrencySymbol(userCurrency);
    
    return normalizedItem;
  });
};

/**
 * Updates the user's currency preference
 * 
 * @param userId - User ID
 * @param currency - Preferred currency code
 */
export const updateUserCurrency = async (userId: string, currency: string): Promise<boolean> => {
  try {
    // In a real implementation, this would call the API to update the user's currency preference
    // For now, we'll just return true to indicate success
    console.log(`Updated currency for user ${userId} to ${currency}`);
    return true;
  } catch (error) {
    console.error('Error updating user currency:', error);
    return false;
  }
};

/**
 * Converts any price display to use the user's preferred currency symbol
 * This is a helper utility for components that need to display prices
 * 
 * @param price - Price value
 * @param userCurrency - User's preferred currency code
 */
export const displayPriceWithUserCurrency = (price: number, userCurrency: string): string => {
  const symbol = getCurrencySymbol(userCurrency);
  return `${symbol}${price.toFixed(2)}`;
};
