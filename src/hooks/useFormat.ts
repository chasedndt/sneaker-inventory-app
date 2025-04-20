// src/hooks/useFormat.ts
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import dayjs from 'dayjs';

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
    if (isNaN(amount)) {
      console.warn('Invalid amount provided to money formatter:', amount);
      amount = 0;
    }
    
    try {
      // If we have a settings context, use its formatting
      if (settings) {
        // Convert currency if needed
        if (originalCurrency && originalCurrency !== settings.currency) {
          amount = settings.convertCurrency(amount, originalCurrency);
        }
        
        return settings.formatCurrency(amount);
      }
      
      // Fallback formatting if settings context is not available
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `$${amount.toFixed(2)}`;
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