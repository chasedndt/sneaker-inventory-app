// src/contexts/SettingsContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { 
  currencyConverter, 
  fetchExchangeRates, 
  storeExchangeRates, 
  getStoredExchangeRates
} from '../utils/currencyUtils';
import { formatDate as formatDateUtil } from '../utils/dateUtils';
import { useAuth } from './AuthContext';

// Define the settings structure
interface Settings {
  darkMode: boolean;
  currency: string;
  dateFormat: string;
}

// Exchange rates type
interface ExchangeRates {
  [key: string]: number;
}

// Define the context shape
interface SettingsContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  currency: string;
  setCurrency: (currency: string) => void;
  dateFormat: string;
  setDateFormat: (format: string) => void;
  formatDate: (date: Date | string) => string;
  formatCurrency: (amount: number, fromCurrency?: string) => string;
  getCurrentCurrency: () => string;
  convertCurrency: (amount: number, fromCurrency: string) => number;
  saveSettings: (settings: Settings) => void;
  refreshExchangeRates: () => Promise<boolean>;
  exchangeRates: ExchangeRates | null;
  lastRatesUpdate: Date | null;
}

// Create the context with default undefined value
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Custom hook to use the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

// Default settings
const defaultSettings: Settings = {
  darkMode: false,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
};

// Settings Provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const userSettingsKey = currentUser ? `hypelist_settings_${currentUser.uid}` : 'hypelist_settings';
  
  // Initialize settings state from localStorage or defaults
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const storedSettings = localStorage.getItem(userSettingsKey);
      return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return defaultSettings;
    }
  });

  // State for exchange rates
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [lastRatesUpdate, setLastRatesUpdate] = useState<Date | null>(null);

  // Extract individual settings for convenience
  const { darkMode, currency, dateFormat } = settings;

  // Initialize exchange rates
  useEffect(() => {
    const initExchangeRates = async () => {
      // Try to get stored rates first
      const storedRates = getStoredExchangeRates();
      
      if (storedRates) {
        setExchangeRates(storedRates.rates);
        setLastRatesUpdate(new Date(storedRates.timestamp));
        console.log('Loaded exchange rates from local storage');
      } else {
        // If no stored rates or they're expired, fetch new ones
        try {
          const freshRates = await fetchExchangeRates();
          setExchangeRates(freshRates);
          setLastRatesUpdate(new Date());
          storeExchangeRates(freshRates);
          console.log('Fetched fresh exchange rates');
        } catch (error) {
          console.error('Failed to fetch exchange rates:', error);
        }
      }
    };
    
    initExchangeRates();
  }, []);

  // Save settings whenever they change or when user changes
  useEffect(() => {
    if (userSettingsKey) {
      try {
        localStorage.setItem(userSettingsKey, JSON.stringify(settings));
        console.log('Settings saved to localStorage:', settings);
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
    }
  }, [settings, userSettingsKey]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setSettings(prevSettings => ({
      ...prevSettings,
      darkMode: !prevSettings.darkMode,
    }));
    console.log("Dark mode toggled, new value:", !darkMode);
  }, [darkMode]);

  // Set currency with enhanced logging and persistence
  const setCurrency = useCallback((newCurrency: string) => {
    console.log(`[SettingsContext] Attempting to set currency to: ${newCurrency}`);
    setSettings(prevSettings => {
      if (newCurrency !== prevSettings.currency) {
        const updatedSettings = { ...prevSettings, currency: newCurrency };
        console.log('[SettingsContext] Currency updated in state:', updatedSettings);
        // Persist immediately after state update
        try {
          localStorage.setItem(userSettingsKey, JSON.stringify(updatedSettings));
          console.log('[SettingsContext] Currency settings persisted to localStorage.');
        } catch (error) {
          console.error('[SettingsContext] Error persisting currency settings:', error);
        }
        return updatedSettings;
      }
      console.log(`[SettingsContext] Currency is already ${newCurrency}, no update needed.`);
      return prevSettings;
    });
  }, [userSettingsKey]);

  // Set date format
  const setDateFormat = useCallback((newFormat: string) => {
    setSettings(prev => ({
      ...prev,
      dateFormat: newFormat,
    }));
    console.log("Date format changed to:", newFormat);
  }, []);

  // Refresh exchange rates manually
  const refreshExchangeRates = useCallback(async (): Promise<boolean> => {
    try {
      const freshRates = await fetchExchangeRates();
      setExchangeRates(freshRates);
      setLastRatesUpdate(new Date());
      storeExchangeRates(freshRates);
      console.log('Manually refreshed exchange rates');
      return true;
    } catch (error) {
      console.error('Failed to manually refresh exchange rates:', error);
      return false;
    }
  }, []);

  // Format date according to selected format
  const formatDate = useCallback((date: Date | string): string => {
    return formatDateUtil(date, dateFormat);
  }, [dateFormat]);

  // Get the current currency symbol with robust error handling
  const getCurrentCurrency = useCallback((): string => {
    // Only log in debug mode to reduce console noise
    const isDebugMode = false; // Set to true only when actively debugging

    if (isDebugMode) {
      console.log(`[SettingsContext] getCurrentCurrency called. Current currency setting: ${currency}`);
    }

    if (!currency) {
      if (isDebugMode) {
        console.warn('[SettingsContext] Currency is not set, defaulting to USD symbol ($).');
      }
      return '$'; // Default to USD symbol if currency is not set
    }

    try {
      // Use Intl.NumberFormat to get the currency symbol
      // This is a more robust way to get symbols for various currencies
      const formatter = new Intl.NumberFormat(undefined, { // Use undefined locale to let browser decide
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0, // We only need the symbol
        maximumFractionDigits: 0
      });
      
      // Extract the symbol part. This is a bit hacky but generally works.
      const parts = formatter.formatToParts(0);
      const symbolPart = parts.find(part => part.type === 'currency');
      
      if (symbolPart) {
        if (isDebugMode) {
          console.log(`[SettingsContext] Resolved currency symbol: ${symbolPart.value} for ${currency}`);
        }
        return symbolPart.value;
      } else {
        if (isDebugMode) {
          console.warn(`[SettingsContext] Could not resolve symbol for ${currency} using Intl, returning currency code.`);
        }
        return currency; // Fallback to currency code if symbol not found
      }
    } catch (error) {
      if (isDebugMode) {
        console.error(`[SettingsContext] Error getting currency symbol for ${currency}:`, error);
      }
      // Fallback for unsupported currencies or errors
      return currency; // Return the currency code as a fallback
    }
  }, [currency]);

  // Convert currency using the latest exchange rates with minimal logging
  const convertCurrency = useCallback((amount: number, fromCurrency: string = 'USD'): number => {
    // Only log important conversions to reduce noise
    const isSignificantAmount = amount > 100 || Math.abs(amount) > 100;
    const isDebugMode = false; // Set to true only when actively debugging currency issues
    
    // Handle edge cases better
    if (isNaN(amount)) {
      console.warn('Invalid amount provided to convertCurrency');
      return 0;
    }
    
    // If the currencies are the same, no conversion needed
    if (fromCurrency === currency) {
      return amount;
    }
    
    if (exchangeRates) {
      // Only log exchange rates in debug mode
      if (isDebugMode) {
        console.log(`💱 [CURRENCY CONVERSION] Using exchange rates:`, exchangeRates);
      }
      
      // Normalize currency codes to upper case
      const normalizedFromCurrency = fromCurrency.toUpperCase();
      const normalizedTargetCurrency = currency.toUpperCase();
      
      // Check if we have the necessary rates
      if (exchangeRates[normalizedFromCurrency] && exchangeRates[normalizedTargetCurrency]) {
        // First convert to USD (our base currency in the rates)
        const amountInUSD = normalizedFromCurrency === 'USD' 
          ? amount 
          : amount / exchangeRates[normalizedFromCurrency];
        
        // Then convert from USD to target currency
        const result = amountInUSD * exchangeRates[normalizedTargetCurrency];
        
        // Only log significant conversions to reduce console noise
        if (isSignificantAmount && isDebugMode) {
          console.log(`💱 [CURRENCY CONVERSION] ${amount} ${fromCurrency} = ${result} ${currency}`);
        }
        
        return result;
      } else {
        console.warn(`⚠️ [CURRENCY CONVERSION] Missing exchange rate for ${fromCurrency} or ${currency}, falling back to direct conversion`);
      }
    } else {
      console.warn(`⚠️ [CURRENCY CONVERSION] No exchange rates available, falling back to direct conversion`);
    }
    
    // Fall back to direct conversion with built-in rates
    const result = currencyConverter(amount, fromCurrency, currency, isDebugMode);
    
    if (isDebugMode) {
      console.log(`💱 [CURRENCY CONVERSION] Fallback conversion: ${amount} ${fromCurrency} = ${result} ${currency}`);
    }
    return result;
  }, [currency, exchangeRates]);

  // Format currency according to selected currency with improved error handling and locale support
  const formatCurrency = useCallback((amount: number, fromCurrency?: string): string => {
    if (isNaN(amount)) {
      console.warn('Invalid amount provided to formatCurrency');
      amount = 0;
    }
    
    // Only log in debug mode to reduce console noise
    const isDebugMode = false; // Set to true only when actively debugging
    
    try {
      // Calculate the final amount based on whether conversion is needed
      let finalAmount = amount;
      
      // Only convert if fromCurrency is explicitly specified and different from the target currency
      if (fromCurrency && fromCurrency !== currency) {
        finalAmount = convertCurrency(amount, fromCurrency);
      }
      
      // Map of currency codes to appropriate locales for better formatting
      const localeMap: Record<string, string> = {
        'USD': 'en-US',
        'EUR': 'de-DE', // German locale for Euro
        'GBP': 'en-GB', // British locale for Pound Sterling
        'JPY': 'ja-JP', // Japanese locale for Yen
        'CAD': 'en-CA', // Canadian locale for Canadian Dollar
        'AUD': 'en-AU', // Australian locale for Australian Dollar
        'INR': 'en-IN', // Indian locale for Rupee
        'CNY': 'zh-CN', // Chinese locale for Yuan
        'CHF': 'de-CH', // Swiss locale for Swiss Franc
        'SEK': 'sv-SE', // Swedish locale for Swedish Krona
        'NZD': 'en-NZ', // New Zealand locale
        'KRW': 'ko-KR', // Korean locale
        'SGD': 'en-SG', // Singapore locale
        'HKD': 'zh-HK'  // Hong Kong locale
      };
      
      // Get the appropriate locale for the currency, or default to English
      const locale = localeMap[currency] || 'en';
      
      // Use Intl.NumberFormat for proper locale-aware formatting
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(finalAmount);
    } catch (error) {
      console.error('Error in formatCurrency:', error);
      // Fallback to a basic formatting with the current currency symbol
      return `${getCurrentCurrency()}${amount.toFixed(2)}`;
    }
  }, [currency, convertCurrency, getCurrentCurrency]);

  // Save all settings at once (for use in settings page)
  const saveSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
  }, []);

  // Create value object for the context, memoized to prevent unnecessary re-renders
  const value = useMemo(() => ({
    darkMode,
    toggleDarkMode,
    currency,
    setCurrency,
    dateFormat,
    setDateFormat,
    formatDate,
    formatCurrency,
    getCurrentCurrency,
    convertCurrency,
    saveSettings,
    refreshExchangeRates,
    exchangeRates,
    lastRatesUpdate,
  }), [
    darkMode,
    toggleDarkMode,
    currency,
    setCurrency,
    dateFormat,
    setDateFormat,
    formatDate,
    formatCurrency,
    getCurrentCurrency,
    convertCurrency,
    saveSettings,
    refreshExchangeRates,
    exchangeRates,
    lastRatesUpdate,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;