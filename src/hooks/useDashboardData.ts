// src/hooks/useDashboardData.ts
import { useState, useEffect, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { api, Item } from '../services/api';
import { useAuthReady } from './useAuthReady'; // Assuming useAuthReady is in the same hooks folder
// import { useAuth } from '../contexts/AuthContext'; // If useAuth is no longer needed for other properties
import { salesApi, Sale } from '../services/salesApi';
import { expensesApi } from '../services/expensesApi';
import { Expense } from '../models/expenses';
import { dashboardService } from '../services/dashboardService';
import { useSettings } from '../contexts/SettingsContext';
import { currencyConverter } from '../utils/currencyUtils';
import { InventoryItem } from '../pages/InventoryPage';

// Control debug logging globally
const enableDebugLogging = true;

interface DashboardData {
  items: Item[];
  sales: Sale[];
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface FilteredData {
  filteredItems: Item[];
  filteredSales: Sale[];
  filteredExpenses: Expense[];
}

interface DashboardDataHook extends DashboardData {
  fetchData: (showRefreshing?: boolean) => Promise<void>;
  getFilteredData: (startDate: Dayjs | null, endDate: Dayjs | null) => FilteredData;
  calculatePortfolioData: (startDate: Dayjs | null, endDate: Dayjs | null) => {
    currentValue: number;
    expensesTotal: number;
    salesTotal: number;
    profit: number;
  };
}

/**
 * Custom hook for fetching and filtering dashboard data
 */
const useDashboardData = (): DashboardDataHook => {
  const { authReady, currentUser } = useAuthReady();
  const { currency } = useSettings();
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from APIs
  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      if (enableDebugLogging) {
        console.log('🔄 Fetching inventory items, sales, and expenses data...');
      }
      
      // Fetch all necessary data in one call after authentication
      const data = await dashboardService.getDashboardData();
      
      // Update state with all datasets
      setItems(data.items);
      setSales(data.sales);
      setExpenses(data.expenses);
      setError(null);
      
    } catch (err: any) {
      // Always log errors
      console.error('💥 Error fetching data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Only fetch data after authentication is verified
  useEffect(() => {
    if (authReady && currentUser) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUser, fetchData]);

  // Filter data based on date range
  const getFilteredData = (startDate: Dayjs | null, endDate: Dayjs | null): FilteredData => {
    let filteredItems = [...items];
    let filteredSales = [...sales];
    let filteredExpenses = [...expenses];
    
    if (startDate && endDate) {
      const startTimestamp = startDate.startOf('day').valueOf();
      const endTimestamp = endDate.endOf('day').valueOf();
      
      // Filter items by purchase date
      filteredItems = items.filter(item => {
        const purchaseDate = new Date(item.purchaseDate).getTime();
        return purchaseDate >= startTimestamp && purchaseDate <= endTimestamp;
      });
      
      // Filter sales by sale date
      filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.saleDate).getTime();
        return saleDate >= startTimestamp && saleDate <= endTimestamp;
      });
      
      // Filter expenses by expense date
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate).getTime();
        return expenseDate >= startTimestamp && expenseDate <= endTimestamp;
      });
    }
    
    return {
      filteredItems,
      filteredSales,
      filteredExpenses
    };
  };
  
  // Calculate portfolio values for time ranges
  const calculatePortfolioData = (startDate: Dayjs | null, endDate: Dayjs | null) => {
    const { filteredItems, filteredSales, filteredExpenses } = getFilteredData(startDate, endDate);
    
    // Log only once at the start of the calculation and only if debug logging is enabled
    if (enableDebugLogging) {
      console.log(`📊 [DASHBOARD] Calculating portfolio value for ${filteredItems.length} items in ${currency || 'USD'}`);
    }
    
    // Calculate current portfolio value with proper currency conversion
    const currentValue = filteredItems.reduce((sum, item, index) => {
      // Get the base market price and currency info
      let marketPrice = item.marketPrice || (item.purchasePrice * 1.2); // Default 20% markup if no market price
      
      // Treat item as InventoryItem to access all needed properties
      const inventoryItem = item as InventoryItem;
      const marketPriceCurrency = inventoryItem.marketPriceCurrency || 'GBP'; // Default to GBP if not specified
      
      // Original values before conversion
      const originalMarketPrice = marketPrice;
      
      // Convert the market price to the display currency if needed
      if (marketPriceCurrency !== currency) {
        try {
          marketPrice = currencyConverter(marketPrice, marketPriceCurrency, currency || 'USD', enableDebugLogging);
          // Only log significant conversions or first/last items for reference when debug logging is enabled
          if (enableDebugLogging && (index === 0 || index === filteredItems.length-1 || Math.abs(marketPrice - originalMarketPrice) > 5)) {
            console.log(`💱 Item ${item.productName}: ${marketPriceCurrency} ${originalMarketPrice.toFixed(2)} → ${currency || 'USD'} ${marketPrice.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`❌ Currency conversion error for ${item.productName}:`, error);
        }
      }
      
      return sum + marketPrice;
    }, 0);
    
    if (enableDebugLogging) {
      console.log(`📊 [DASHBOARD] Final portfolio value: ${currentValue.toFixed(2)} ${currency || 'USD'}`);
    }

    
    // Calculate expenses total with currency conversion
    const expensesTotal = filteredExpenses.reduce((sum, expense) => {
      let expenseAmount = expense.amount;
      const expenseCurrency = expense.currency || 'USD';
      
      // Convert expense amount to display currency if needed
      if (expenseCurrency !== currency) {
        try {
          expenseAmount = currencyConverter(expenseAmount, expenseCurrency, currency || 'USD', enableDebugLogging);
          if (enableDebugLogging) {
            console.log(`💰 [EXPENSE] Converted ${expense.amount} ${expenseCurrency} → ${expenseAmount.toFixed(2)} ${currency}`);
          }
        } catch (error) {
          if (enableDebugLogging) {
            console.warn(`⚠️ [EXPENSE] Failed to convert ${expense.amount} ${expenseCurrency} to ${currency}, using original amount`);
          }
          // Use original amount if conversion fails
        }
      }
      
      return sum + expenseAmount;
    }, 0);
    
    // Calculate sales total with currency conversion
    const salesTotal = filteredSales.reduce((sum, sale) => {
      let saleAmount = sale.salePrice;
      const saleCurrency = sale.currency || 'USD';
      
      // Convert sale amount to display currency if needed
      if (saleCurrency !== currency) {
        try {
          saleAmount = currencyConverter(saleAmount, saleCurrency, currency || 'USD', enableDebugLogging);
          if (enableDebugLogging) {
            console.log(`💰 [SALE] Converted ${sale.salePrice} ${saleCurrency} → ${saleAmount.toFixed(2)} ${currency}`);
          }
        } catch (error) {
          if (enableDebugLogging) {
            console.warn(`⚠️ [SALE] Failed to convert ${sale.salePrice} ${saleCurrency} to ${currency}, using original amount`);
          }
          // Use original amount if conversion fails
        }
      }
      
      return sum + saleAmount;
    }, 0);
    
    // Calculate profit
    const profit = salesTotal - expensesTotal;
    
    return {
      currentValue,
      expensesTotal,
      salesTotal,
      profit
    };
  };

  return {
    items,
    sales,
    expenses,
    loading,
    refreshing,
    error,
    fetchData,
    getFilteredData,
    calculatePortfolioData
  };
};

export default useDashboardData;