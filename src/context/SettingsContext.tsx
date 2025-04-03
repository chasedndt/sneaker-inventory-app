// src/context/SettingsContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
  currencyConverter, 
  fetchExchangeRates, 
  storeExchangeRates, 
  getStoredExchangeRates,
  formatCurrencyWithSymbol
} from '../utils/currencyUtils';
import { formatDate as formatDateUtil } from '../utils/dateUtils';

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
  formatCurrency: (amount: number) => string;
  convertCurrency: (amount: number, fromCurrency: string) => number;
  saveSettings: (settings: Settings) => void;
  refreshExchangeRates: () => Promise<boolean>;
  exchangeRates: ExchangeRates | null;
  lastRatesUpdate: Date | null;
}

// Create the context with default values
const SettingsContext = createContext<SettingsContextType>({
  darkMode: true,
  toggleDarkMode: () => {},
  currency: 'USD',
  setCurrency: () => {},
  dateFormat: 'MM/DD/YYYY',
  setDateFormat: () => {},
  formatDate: () => '',
  formatCurrency: () => '',
  convertCurrency: () => 0,
  saveSettings: () => {},
  refreshExchangeRates: async () => false,
  exchangeRates: null,
  lastRatesUpdate: null,
});

// Settings storage key
const SETTINGS_STORAGE_KEY = 'hypelist_settings';

// Default settings
const defaultSettings: Settings = {
  darkMode: true,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Initialize settings state from localStorage or defaults
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
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

  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      console.log('Settings saved to localStorage:', settings);
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [settings]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setSettings(prev => ({
      ...prev,
      darkMode: !prev.darkMode,
    }));
    console.log("Dark mode toggled, new value:", !darkMode);
  };

  // Set currency
  const setCurrency = (newCurrency: string) => {
    setSettings(prev => ({
      ...prev,
      currency: newCurrency,
    }));
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

  // Convert currency using the latest exchange rates
  const convertCurrency = (amount: number, fromCurrency: string = 'USD'): number => {
    // If amount is 0 or not a number, return 0
    if (amount === 0 || isNaN(amount)) return 0;
    
    // If we have exchange rates, use them
    if (exchangeRates) {
      // Quick return if currencies are the same
      if (fromCurrency === currency) return amount;
      
      // If both currencies exist in our rates
      if (exchangeRates[fromCurrency] && exchangeRates[currency]) {
        // Convert to USD first if not already USD
        const amountInUSD = fromCurrency === 'USD' 
          ? amount 
          : amount / exchangeRates[fromCurrency];
        
        // Then convert from USD to target currency
        return amountInUSD * exchangeRates[currency];
      }
    }
    
    // Fall back to static conversion if no rates available
    return currencyConverter(amount, fromCurrency, currency);
  };

  // Format currency according to selected currency
  const formatCurrency = (amount: number): string => {
    if (isNaN(amount)) {
      console.warn('Invalid amount provided to formatCurrency:', amount);
      amount = 0;
    }
    const convertedAmount = convertCurrency(amount, 'USD');
    return formatCurrencyWithSymbol(convertedAmount, currency);
  };

  // Save all settings at once (for use in settings page)
  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        currency,
        setCurrency,
        dateFormat,
        setDateFormat,
        formatDate,
        formatCurrency,
        convertCurrency,
        saveSettings,
        refreshExchangeRates,
        exchangeRates,
        lastRatesUpdate,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook for using settings
export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;