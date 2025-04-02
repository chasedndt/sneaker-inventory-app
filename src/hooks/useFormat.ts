// src/hooks/useFormat.ts
import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Custom hook for formatting values according to user settings
 * This provides a convenient way to format dates, currency amounts, etc.
 * across the application using the user's preferences
 */
const useFormat = () => {
  const { 
    formatDate, 
    formatCurrency, 
    convertCurrency,
    currency,
    dateFormat 
  } = useSettings();

  /**
   * Format a date according to user's date format preference
   * @param date - Date to format
   * @returns Formatted date string
   */
  const date = useCallback((date: Date | string) => {
    return formatDate(date);
  }, [formatDate]);

  /**
   * Format a monetary value according to user's currency preference
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  const money = useCallback((amount: number) => {
    return formatCurrency(amount);
  }, [formatCurrency]);

  /**
   * Convert an amount from one currency to the user's preferred currency
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency code
   * @returns Converted amount (number only, no formatting)
   */
  const convert = useCallback((amount: number, fromCurrency: string = 'USD') => {
    return convertCurrency(amount, fromCurrency);
  }, [convertCurrency]);

  /**
   * Convert and format an amount from one currency to the user's preferred currency
   * @param amount - Amount to convert and format
   * @param fromCurrency - Source currency code
   * @returns Formatted currency string
   */
  const convertAndFormat = useCallback((amount: number, fromCurrency: string = 'USD') => {
    const converted = convertCurrency(amount, fromCurrency);
    return formatCurrency(converted);
  }, [convertCurrency, formatCurrency]);

  /**
   * Get the current currency code
   * @returns Current currency code (e.g., 'USD')
   */
  const getCurrentCurrency = useCallback(() => {
    return currency;
  }, [currency]);

  /**
   * Get the current date format
   * @returns Current date format (e.g., 'MM/DD/YYYY')
   */
  const getCurrentDateFormat = useCallback(() => {
    return dateFormat;
  }, [dateFormat]);

  return {
    date,
    money,
    convert,
    convertAndFormat,
    getCurrentCurrency,
    getCurrentDateFormat,
  };
};

export default useFormat;