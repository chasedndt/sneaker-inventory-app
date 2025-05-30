// src/hooks/useFormat.ts
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import dayjs from 'dayjs';

// Global debug flag - set to false by default to minimize logging
const enableDebugLogging = false;

/**
 * Custom hook for formatting values consistently throughout the app
 * Leverages the SettingsContext for currency, date formatting, etc.
 */
const useFormat = () => {
  const settings = useSettings();

  /**
   * Format a monetary value according to user's currency preferences
   * @param amount Amount to format
   * @param originalCurrency Optional original currency if different from user's preference
   * @returns Formatted currency string
   */
  const money = (amount: number, originalCurrency?: string): string => {
    // LOGGING DISABLED - Too much console noise
    // NO DEBUG LOGGING - Uncomment below for debugging only
    // const caller = new Error().stack?.split('\n')[2] || 'unknown';
    // console.log(`💲 [MONEY FORMAT] amount: ${amount}, from currency: ${originalCurrency || 'none'}, to currency: ${settings?.currency || 'none'}`);
    
    // Handle invalid input
    if (isNaN(amount)) {
      // Use limited warnings for invalid input only
      console.warn(`Invalid amount in formatter: ${amount}, using 0`);
      amount = 0;
    }
    
    try {
      // Map currency symbols to currency codes if needed
      let sourceCurrency = originalCurrency;
      
      // Convert any currency symbols to proper currency codes
      if (sourceCurrency === '£') sourceCurrency = 'GBP';
      if (sourceCurrency === '$') sourceCurrency = 'USD';
      if (sourceCurrency === '€') sourceCurrency = 'EUR';
      
      // If we have a settings context, use its formatting
      if (settings) {
        // Pass the normalized currency code to the settings formatter along with debug flag
        // The settings.formatCurrency method will handle the correct conversion with proper logging control
        return settings.formatCurrency(amount, sourceCurrency);
      }
      
      // Fallback formatting if settings context is not available
      // If we know the original currency, use its specific formatter
      if (originalCurrency) {
        const localeMap: Record<string, string> = {
          'USD': 'en-US',
          'EUR': 'de-DE',
          'GBP': 'en-GB',
          'JPY': 'ja-JP'
        };
        
        const locale = localeMap[originalCurrency] || 'en-US';
        
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: originalCurrency
        }).format(amount);
      }
      
      // Default to USD if settings context is not available and no original currency specified
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      // Use the user's currency symbol for the fallback if available
      const currencySymbol = settings?.getCurrentCurrency() || '$';
      return `${currencySymbol}${amount.toFixed(2)}`;
    }
  };

  /**
   * Format a date value according to user's date format preferences
   * @param dateValue Date to format (string, Date object, or dayjs object)
   * @returns Formatted date string
   */
  const date = (dateValue: string | Date | dayjs.Dayjs): string => {
    if (!dateValue) {
      return '';
    }
    
    try {
      // Convert to dayjs object if it's not already
      const dayjsDate = dayjs.isDayjs(dateValue) 
        ? dateValue 
        : dayjs(dateValue);
      
      // Use settings format if available
      if (settings) {
        return dayjsDate.format(settings.dateFormat === 'MM/DD/YYYY' 
          ? 'MM/DD/YYYY'
          : settings.dateFormat === 'DD/MM/YYYY'
            ? 'DD/MM/YYYY'
            : 'YYYY-MM-DD'
        );
      }
      
      // Fallback format
      return dayjsDate.format('MM/DD/YYYY');
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(dateValue);
    }
  };

  /**
   * Format a percentage value
   * @param value Percentage value to format
   * @param decimals Number of decimal places
   * @returns Formatted percentage string
   */
  const percentFormat = (value: number, decimals: number = 1): string => {
    if (isNaN(value)) {
      console.warn('Invalid value provided to percent formatter:', value);
      value = 0;
    }
    
    try {
      const formatted = value.toFixed(decimals);
      return `${value >= 0 ? '+' : ''}${formatted}%`;
    } catch (error) {
      console.error('Error formatting percentage:', error);
      return `${value}%`;
    }
  };

  return {
    money,
    date,
    percentFormat
  };
};

export default useFormat;