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
// Removed currencyConverter import - backend now handles all currency conversion
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
      
      // Get user's display currency preference
      const displayCurrency = currency === '$' ? 'USD' : currency === '£' ? 'GBP' : currency === '€' ? 'EUR' : 'USD';
      
      if (enableDebugLogging) {
        console.log(`🔄 Fetching inventory items, sales, and expenses data with currency: ${displayCurrency}`);
      }
      
      // Fetch all necessary data in one call after authentication with display currency
      const data = await dashboardService.getDashboardData(displayCurrency);
      
      if (enableDebugLogging) {
        console.log(`✅ Received ${data.items.length} items from backend with converted values`);
        // Log first item to verify conversion
        if (data.items.length > 0) {
          const firstItem = data.items[0];
          console.log(`📦 Sample item: ${firstItem.productName} - Market: $${firstItem.marketPrice} ${firstItem.marketPriceCurrency || displayCurrency}`);
        }
      }
      
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
  }, [currency]);

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
      // Backend already converted market price to display currency
      if (enableDebugLogging && index < 3) {
        console.log(`💱 Item ${item.productName}: Backend converted price ${marketPrice.toFixed(2)} ${currency || 'USD'}`);
      }
      
      return sum + marketPrice;
    }, 0);
    
    if (enableDebugLogging) {
      console.log(`📊 [DASHBOARD] Final portfolio value: ${currentValue.toFixed(2)} ${currency || 'USD'}`);
    }

    
    // Calculate expenses total (backend already converted to display currency)
    const expensesTotal = filteredExpenses.reduce((sum, expense) => {
      const expenseAmount = expense.amount;
      
      if (enableDebugLogging && filteredExpenses.indexOf(expense) < 3) {
        console.log(`💰 [EXPENSE] Backend converted amount: ${expenseAmount.toFixed(2)} ${currency}`);
      }
      
      return sum + expenseAmount;
    }, 0);
    
    // Calculate sales total (backend already converted to display currency)
    const salesTotal = filteredSales.reduce((sum, sale) => {
      const saleAmount = sale.salePrice;
      
      if (enableDebugLogging && filteredSales.indexOf(sale) < 3) {
        console.log(`💰 [SALE] Backend converted amount: ${saleAmount.toFixed(2)} ${currency}`);
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