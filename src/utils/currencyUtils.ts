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

/**
 * Convert amount from one currency to another with enhanced debugging
 * @param amount - Amount to convert
 * @param fromCurrency - Currency to convert from
 * @param toCurrency - Currency to convert to
 * @returns Converted amount
 */
export const currencyConverter = (amount: number, fromCurrency: string, toCurrency: string): number => {
  // Normalize currency inputs to handle both symbols and codes
  const normalizeToCode = (currency: string): string => {
    // If it's a currency symbol, convert to code
    if (CURRENCY_CODE_FROM_SYMBOL[currency]) {
      console.log(`Normalized currency symbol ${currency} to code ${CURRENCY_CODE_FROM_SYMBOL[currency]}`);
      return CURRENCY_CODE_FROM_SYMBOL[currency];
    }
    // If it matches one of our known codes, return as is
    if (Object.keys(EXCHANGE_RATES).includes(currency)) {
      return currency;
    }
    // Default to USD if unknown
    console.warn(`Unknown currency format: ${currency}, defaulting to USD`);
    return 'USD';
  };

  // Normalize both currencies
  const normalizedFromCurrency = normalizeToCode(fromCurrency);
  const normalizedToCurrency = normalizeToCode(toCurrency);
  
  // Detailed logging to track conversions
  console.log(`Converting ${amount} from ${fromCurrency} (${normalizedFromCurrency}) to ${toCurrency} (${normalizedToCurrency})`);
  
  // Handle invalid inputs
  if (isNaN(amount)) {
    console.error('Invalid amount provided to currencyConverter');
    return 0;
  }
  
  // If same currency after normalization, return amount as is
  if (normalizedFromCurrency === normalizedToCurrency) {
    console.log('Same currency after normalization - no conversion needed');
    return amount;
  }
  
  // Check if currencies are supported
  if (!EXCHANGE_RATES[normalizedFromCurrency] || !EXCHANGE_RATES[normalizedToCurrency]) {
    console.error(`Unsupported currency after normalization: ${normalizedFromCurrency} or ${normalizedToCurrency}`);
    return amount; // Return original amount as fallback
  }
  
  // Convert using exchange rates with normalized currency codes
  // Convert to USD first (as base currency)
  const amountInUSD = amount / EXCHANGE_RATES[normalizedFromCurrency];
  
  // Then convert from USD to target currency
  const result = amountInUSD * EXCHANGE_RATES[normalizedToCurrency];
  
  console.log(`Converted ${amount} ${fromCurrency} to ${result.toFixed(2)} ${toCurrency}`);
  console.log(`Using rates: 1 USD = ${EXCHANGE_RATES[normalizedFromCurrency]} ${normalizedFromCurrency} and 1 USD = ${EXCHANGE_RATES[normalizedToCurrency]} ${normalizedToCurrency}`);
  
  return result;
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
   * @returns Formatted currency string with symbol
   */
  export const convertAndFormatCurrency = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): string => {
    const convertedAmount = currencyConverter(amount, fromCurrency, toCurrency);
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