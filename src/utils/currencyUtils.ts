// src/utils/currencyUtils.ts

// Exchange rates relative to USD (1 USD = X units of currency)
// In a production app, these would be fetched from an API
interface ExchangeRates {
  [key: string]: number;
}

// Exchange rates as of May 2025 (relative to USD: 1 USD = X units of currency)
const EXCHANGE_RATES: ExchangeRates = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 151.67,
  CAD: 1.36,
  AUD: 1.51,
  CNY: 7.24,
};

// Currency symbol mappings
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CNY: '¥',
};

// Currency code from symbol
export const CURRENCY_CODE_FROM_SYMBOL: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'C$': 'CAD',
  'A$': 'AUD',
};

// Simplified display for the calculated exchange rates (for cleaner logging)
const formatRate = (rate: number): string => rate.toFixed(4);

/**
 * Normalize currency inputs to handle both symbols and codes
 * @param currency - Currency symbol or code to normalize
 * @returns Normalized currency code
 */
export const normalizeCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD'; // Default if undefined
  
  // Trim whitespace and handle uppercase/lowercase
  const normalizedInput = currency.trim().toUpperCase();
  
  // If it's a currency symbol, convert to code
  if (CURRENCY_CODE_FROM_SYMBOL[normalizedInput]) {
    return CURRENCY_CODE_FROM_SYMBOL[normalizedInput];
  }
  
  // If it matches one of our known codes, return as is
  if (Object.keys(EXCHANGE_RATES).includes(normalizedInput)) {
    return normalizedInput;
  }
  
  // Special handling for common abbreviations/typos
  const mappings: Record<string, string> = {
    'DOLLAR': 'USD',
    'US': 'USD',
    'EURO': 'EUR',
    'POUND': 'GBP',
    'UK': 'GBP',
    'YEN': 'JPY',
  };
  
  if (mappings[normalizedInput]) {
    return mappings[normalizedInput];
  }
  
  // Default to USD if unknown
  return 'USD';
};

/**
 * Convert amount from one currency to another with enhanced reliability
 * @param amount - Amount to convert
 * @param fromCurrency - Currency to convert from
 * @param toCurrency - Currency to convert to
 * @param enableDebugLogging - Whether to log conversion details (default: false)
 * @returns Converted amount
 */
export const currencyConverter = (amount: number, fromCurrency: string, toCurrency: string, enableDebugLogging: boolean = false): number => {
  // Handle invalid inputs
  if (isNaN(amount)) {
    return 0;
  }
  
  // Normalize both currencies
  const normalizedFromCurrency = normalizeCurrencyCode(fromCurrency);
  const normalizedToCurrency = normalizeCurrencyCode(toCurrency);
  
  // If same currency after normalization, return amount as is
  if (normalizedFromCurrency === normalizedToCurrency) {
    return amount;
  }
  
  // Check if currencies are supported
  if (!EXCHANGE_RATES[normalizedFromCurrency] || !EXCHANGE_RATES[normalizedToCurrency]) {
    // Log once but don't spam
    console.warn(`Unsupported currency: ${normalizedFromCurrency} or ${normalizedToCurrency}, using original amount`);
    return amount;
  }
  
  try {
    // Convert to USD first (as base currency)
    const amountInUSD = amount / EXCHANGE_RATES[normalizedFromCurrency];
    
    // Then convert from USD to target currency
    const result = amountInUSD * EXCHANGE_RATES[normalizedToCurrency];
    
    if (enableDebugLogging) {
      console.log(`💱 [CURRENCY CONVERSION] ${amount} ${normalizedFromCurrency} = ${result.toFixed(2)} ${normalizedToCurrency} (Rate: ${formatRate(EXCHANGE_RATES[normalizedToCurrency]/EXCHANGE_RATES[normalizedFromCurrency])})`);    
    }
    return result;
  } catch (error) {
    console.error('Currency conversion error:', error);
    return amount; // Return original amount as fallback
  }
};

/**
 * Format currency for display
 * @param amount - Amount to format
 * @param currencyCode - Currency code
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  const normalizedCode = normalizeCurrencyCode(currencyCode);
  const symbol = CURRENCY_SYMBOLS[normalizedCode] || '$';
  
  return `${symbol}${amount.toFixed(2)}`;
};


/**
 * Format amount with currency symbol based on currency code
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted currency string
   */
  export const formatCurrencyWithSymbol = (amount: number, currency: string): string => {
    switch (currency) {
      case 'USD':
        return `$${amount.toFixed(2)}`;
      case 'EUR':
        return `€${amount.toFixed(2)}`;
      case 'GBP':
        return `£${amount.toFixed(2)}`;
      case 'JPY':
        return `¥${Math.round(amount)}`; // JPY typically doesn't use decimal places
      case 'CAD':
        return `C$${amount.toFixed(2)}`;
      case 'AUD':
        return `A$${amount.toFixed(2)}`;
      case 'CNY':
        return `¥${amount.toFixed(2)}`;
      default:
        return `$${amount.toFixed(2)}`;
    }
  };
  
  /**
   * Get currency symbol from currency code
   * @param currency - Currency code (USD, EUR, etc.)
   * @returns Currency symbol ($, €, etc.)
   */
  export const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'JPY':
      case 'CNY':
        return '¥';
      case 'CAD':
        return 'C$';
      case 'AUD':
        return 'A$';
      default:
        return '$';
    }
  };
  
  /**
   * Convert and format currency in one step
   * @param amount - Amount to convert and format
   * @param fromCurrency - Currency to convert from
   * @param toCurrency - Currency to convert to
   * @param enableDebugLogging - Whether to log conversion details (default: false)
   * @returns Formatted currency string with symbol
   */
  export const convertAndFormatCurrency = (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    enableDebugLogging: boolean = false
  ): string => {
    const convertedAmount = currencyConverter(amount, fromCurrency, toCurrency, enableDebugLogging);
    return formatCurrencyWithSymbol(convertedAmount, toCurrency);
  };
  
  /**
   * Fetch current exchange rates from an API
   * Uses a public API to get real-time exchange rates
   */
  export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
    try {
      // Try to fetch from a public API
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.rates) {
        console.log('Successfully fetched exchange rates from API');
        return data.rates;
      } else {
        throw new Error('Invalid response format from exchange rate API');
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      console.log('Falling back to static exchange rates');
      
      // Fall back to static rates if the API request fails
      return EXCHANGE_RATES;
    }
  };
  
  /**
   * Store the exchange rates in local storage
   * @param rates - Exchange rates to store
   */
  export const storeExchangeRates = (rates: ExchangeRates): void => {
    try {
      localStorage.setItem('exchange_rates', JSON.stringify({
        rates,
        timestamp: new Date().getTime()
      }));
    } catch (error) {
      console.error('Error storing exchange rates:', error);
    }
  };
  
  /**
   * Get exchange rates from local storage
   * @returns Exchange rates object if valid, null otherwise
   */
  export const getStoredExchangeRates = (): { rates: ExchangeRates; timestamp: number } | null => {
    try {
      const storedData = localStorage.getItem('exchange_rates');
      if (!storedData) return null;
      
      const parsedData = JSON.parse(storedData);
      
      // Ensure data is valid and not older than 24 hours
      const isValid = 
        parsedData && 
        parsedData.rates && 
        parsedData.timestamp &&
        (new Date().getTime() - parsedData.timestamp) < 24 * 60 * 60 * 1000;
      
      return isValid ? parsedData : null;
    } catch (error) {
      console.error('Error retrieving stored exchange rates:', error);
      return null;
    }
  };