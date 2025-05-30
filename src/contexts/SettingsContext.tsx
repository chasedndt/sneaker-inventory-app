// src/contexts/SettingsContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
  currencyConverter, 
  fetchExchangeRates, 
  storeExchangeRates, 
  getStoredExchangeRates,
  formatCurrencyWithSymbol
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
  const toggleDarkMode = () => {
    setSettings(prev => ({
      ...prev,
      darkMode: !prev.darkMode,
    }));
    console.log("Dark mode toggled, new value:", !darkMode);
  };

  // Set currency with enhanced logging and persistence
  const setCurrency = (newCurrency: string) => {
    if (newCurrency === settings.currency) {
      console.log("Currency unchanged, already set to:", newCurrency);
      return; // No change needed
    }
    
    setSettings(prev => ({
      ...prev,
      currency: newCurrency,
    }));
    
    // Force refresh exchange rates when currency changes
    refreshExchangeRates()
      .then(success => {
        if (success) {
          console.log("Exchange rates refreshed after currency change");
        }
      })
      .catch(err => console.error("Failed to refresh rates after currency change:", err));
    
    console.log("Currency changed to:", newCurrency);
  };

  // Set date format
  const setDateFormat = (newFormat: string) => {
    setSettings(prev => ({
      ...prev,
      dateFormat: newFormat,
    }));
    console.log("Date format changed to:", newFormat);
  };

  // Refresh exchange rates manually
  const refreshExchangeRates = async (): Promise<boolean> => {
    try {
      const freshRates = await fetchExchangeRates();
      setExchangeRates(freshRates);
      setLastRatesUpdate(new Date());
      storeExchangeRates(freshRates);
      console.log('Manually refreshed exchange rates');
      return true;
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error);
      return false;
    }
  };

  // Format date according to selected format
  const formatDate = (date: Date | string): string => {
    return formatDateUtil(date, dateFormat);
  };

  // Get the current currency symbol with robust error handling
  const getCurrentCurrency = (): string => {
    // Create a mapping of currency codes to their symbols
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CNY': '¥',
      'INR': '₹',
      'CHF': 'Fr',
      'SEK': 'kr',
      'NZD': 'NZ$',
      'KRW': '₩',
      'SGD': 'S$',
      'HKD': 'HK$',
    };
    
    // Check if the currency is in our known list
    if (currency in currencySymbols) {
      return currencySymbols[currency];
    }
    
    // If we don't recognize the currency, try to get it from Intl API
    try {
      // This uses the browser's Intl API to format a currency symbol
      const formatted = new Intl.NumberFormat('en', { 
        style: 'currency', 
        currency: currency,
        currencyDisplay: 'symbol' 
      }).format(0);
      
      // Extract just the symbol part (remove the zeros/digits)
      const symbol = formatted.replace(/[0-9.,\s]/g, '');
      
      if (symbol) return symbol;
    } catch (error) {
      console.error(`Error getting symbol for currency ${currency}:`, error);
    }
    
    // Default fallback to USD if everything else fails
    console.warn(`Using fallback $ symbol for unknown currency: ${currency}`);
    return '$';
  };

  // Convert currency using the latest exchange rates with minimal logging
  const convertCurrency = (amount: number, fromCurrency: string = 'USD'): number => {
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
  };

  // Format currency according to selected currency with improved error handling and locale support
  const formatCurrency = (amount: number, fromCurrency?: string): string => {
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
  };

  // Save all settings at once (for use in settings page)
  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  // Create value object for the context
  const value: SettingsContextType = {
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
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;