// src/hooks/useDashboardData.ts
import { useState, useEffect, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { api, Item } from '../services/api';
import { salesApi, Sale } from '../services/salesApi';
import { expensesApi } from '../services/expensesApi';
import { Expense } from '../models/expenses';
import { dashboardService } from '../services/dashboardService';

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
}

/**
 * Custom hook for fetching and filtering dashboard data
 */
const useDashboardData = (): DashboardDataHook => {
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
      
      console.log('🔄 Fetching inventory items, sales, and expenses data...');
      
      // Fetch items data
      const itemsData = await api.getItems();
      
      // Filter out sold items for active inventory
      const activeItems = itemsData.filter((item: Item) => item.status !== 'sold');
      console.log(`✅ Received ${activeItems.length} active items from API`);
      
      // Fetch sales data
      const salesData = await salesApi.getSales();
      console.log(`✅ Received ${salesData.length} sales records from API`);
      
      // Fetch expenses data
      const expensesData = await expensesApi.getExpenses();
      console.log(`✅ Received ${expensesData.length} expense records from API`);
      
      // Update state with all datasets
      setItems(activeItems);
      setSales(salesData);
      setExpenses(expensesData);
      setError(null);
      
    } catch (err: any) {
      console.error('💥 Error fetching data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    
    // Calculate current portfolio value
    const currentValue = filteredItems.reduce((sum, item) => {
      const marketPrice = item.marketPrice || (item.purchasePrice * 1.2); // Default 20% markup if no market price
      return sum + marketPrice;
    }, 0);
    
    // Calculate expenses total
    const expensesTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate sales total
    const salesTotal = filteredSales.reduce((sum, sale) => sum + sale.salePrice, 0);
    
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
    getFilteredData
  };
};

export default useDashboardData;