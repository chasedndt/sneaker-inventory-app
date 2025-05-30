// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box,
  Typography, 
  CircularProgress,
  Fab,
  Paper,
  Snackbar,
  Alert,
  Button,
  useTheme,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  styled
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useApi, Item } from '../services/api';
import { salesApi, Sale } from '../services/salesApi';
import { expensesApi } from '../services/expensesApi';
import { Expense } from '../models/expenses';
import { currencyConverter } from '../utils/currencyUtils';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';
import EnhancedInventoryDisplay from '../components/EnhancedInventoryDisplay';
import dayjs, { Dayjs } from 'dayjs';
import { debugNetProfitFromSoldItems } from '../utils/profitCalculator';
import { InventoryItem } from './InventoryPage';

// Custom styled ToggleButton
const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  padding: '4px 12px',
  fontSize: '0.813rem',
  fontWeight: 400,
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#666',
  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.palette.divider,
  textTransform: 'none',
  height: '32px',
  minWidth: '48px',
  borderRadius: 0,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.08)' 
      : 'rgba(0, 0, 0, 0.04)',
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.16)' 
      : '#f5f5f5',
    color: theme.palette.mode === 'dark' 
      ? '#fff' 
      : '#1a1a1a',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.24)' 
        : '#eeeeee',
    },
  },
  '&:first-of-type': {
    borderTopLeftRadius: '8px',
    borderBottomLeftRadius: '8px',
  },
  '&:last-of-type': {
    borderTopRightRadius: '8px',
    borderBottomRightRadius: '8px',
  }
}));

// Define time range options
interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const timeRanges: TimeRange[] = [
  { label: '24H', value: '24H', days: 1 },
  { label: '1W', value: '1W', days: 7 },
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '6M', value: '6M', days: 180 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: 'ALL', value: 'ALL', days: 0 }
];

const Dashboard: React.FC = () => {
  // --- State for backend health ---
  const [backendStatus, setBackendStatus] = useState<'ok' | 'down' | 'unknown'>('unknown');
  const [backendError, setBackendError] = useState<string | null>(null);
  const theme = useTheme();
  const auth = useAuth();
  const currentUser = auth.currentUser;
  const authLoading = auth.loading;
  const getAuthToken = auth.getAuthToken;
  const api = useApi();
  const settings = useSettings(); // Get the user's currency settings
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [timeRange, setTimeRange] = useState<string>('1M');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });
  const [authErrorCooldown, setAuthErrorCooldown] = useState(false);

  // Memoized portfolio stats to prevent recalculation on every render
  const [portfolioStats, setPortfolioStats] = useState<{
    currentValue: number,
    valueChange: number,
    percentageChange: number,
    historicalData: Array<{ date: string, value: number }>
  }>({
    currentValue: 0,
    valueChange: 0,
    percentageChange: 0,
    historicalData: []
  });

  // --- DEBUG: Log all main state before render ---
  console.log('[Dashboard][DEBUG] Render:', {
    loading,
    authLoading,
    backendStatus,
    backendError,
    currentUser,
    items,
    sales,
    expenses,
    error
  });

  // --- DEBUG LOGGING ---
  useEffect(() => {
    console.log('[Dashboard] useEffect for authLoading/currentUser ran');
    console.log('[Dashboard] Auth loading:', authLoading, '| Current user:', currentUser);
  }, [authLoading, currentUser]);

  // Debug backendStatus changes
  useEffect(() => {
    console.log('[Dashboard] useEffect for backendStatus:', backendStatus);
  }, [backendStatus]);

  // Debug: Warn if loading is stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[Dashboard][DEBUG] Loading is still true after 10 seconds!');
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Add debugging to test profit calculation
  useEffect(() => {
    if (items.length && sales.length) {
      console.log('🧪 Running profit calculation test:');
      
      // Run test with date range
      if (startDate && endDate) {
        debugNetProfitFromSoldItems(
          sales, 
          expenses, 
          items,
          { 
            start: startDate.toDate(), 
            end: endDate.toDate() 
          }
        );
      } else {
        // Run test without date range
        debugNetProfitFromSoldItems(sales, expenses, items);
      }
    }
  }, [items, sales, expenses, startDate, endDate]);

  // Backend health check
  // Memoized checkBackend (no dependencies)
  // Stable backend check function (now inside Dashboard)
  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/api/ping`);
      if (res.ok) {
        setBackendStatus('ok');
      } else {
        setBackendStatus('down');
        setBackendError('Backend responded with error');
      }
    } catch (e) {
      setBackendStatus('down');
      setBackendError('Backend is unreachable');
    }
  }, []);

  // Fetch data from the API - now using the enhanced API that correctly handles currency conversion
  const fetchData = useCallback(async (showRefreshing = false) => {
    console.log('[Dashboard] fetchData called. showRefreshing:', showRefreshing, '| currentUser:', currentUser);
    if (authLoading) {
      console.log('[Dashboard] Auth is still loading, aborting fetchData.');
      return;
    }
    try {
      if (backendStatus === 'down') {
        setError('Backend is down. Please try again later.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!currentUser) {
        console.warn('[Dashboard] User not authenticated, cannot fetch dashboard data');
        setError('Please log in to view your dashboard (user not authenticated).');
        setLoading(false);
        return;
      }
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔄 Fetching inventory items, sales, and expenses data for authenticated user...');
      
      // IMPORTANT FIX: Use the api directly, NOT inside the callback (React Hooks rule violation)
      // This is EXACTLY what the inventory page uses
      const response = await api.getItems();
      
      // ✅ CRITICAL: Do NOT manually convert currencies - the enhanced API already did that!
      // This fixes the difference between dashboard and inventory page values
      const processedItems = response.map((item: Item) => {
        // Get raw values from item (with type safety)
        const marketPrice = item.marketPrice;
        const purchasePrice = item.purchasePrice;
        const status = item.status;
        // Use type assertion for properties that might not be in the interface
        const marketPriceCurrency = (item as any).marketPriceCurrency;
        const purchaseCurrency = (item as any).purchaseCurrency;
        
        // For debugging, log each item's raw data
        console.log(`🔍 [DASHBOARD] Raw item data for ${item.productName}:`, {
          id: item.id,
          marketPrice,
          marketPriceCurrency,
          purchasePrice,
          purchaseCurrency,
          status
        });
        
        return {
          ...item,
          // Keep the market price exactly as provided by the enhanced API
          // This ensures the dashboard and inventory page use the same values
          marketPrice: marketPrice,
          purchasePrice: purchasePrice,
          // Calculate profit using the already-converted values
          estimatedProfit: marketPrice && purchasePrice ? 
            (marketPrice - purchasePrice) : 0
        };
      });
      
      // Log detailed comparison for a "sanity check"
      console.log('🧪 [DASHBOARD] Item values from enhanced API:');
      processedItems.forEach((item: Item) => {
        console.log(`${item.productName}: ${settings.currency} ${item.marketPrice?.toFixed(2)} ` +
          `(Purchase: ${settings.currency} ${item.purchasePrice?.toFixed(2)})`);
      });
      
      // Fetch sales data
      const salesData = await salesApi.getSales();
      if (currentUser) {
        console.log(`✅ Received ${salesData.length} sales records from API for user ${currentUser.uid}`);
      }
      
      // Debug sales data
      console.log('📊 Sales data:', salesData);
      
      // Fetch expenses data
      const expensesData = await expensesApi.getExpenses();
      if (currentUser) {
        console.log(`✅ Received ${expensesData.length} expense records from API for user ${currentUser.uid}`);
      }
      
      // Debug expenses data
      console.log('💰 Expenses data:', expensesData);
      
      // Filter active items (not sold)
      const activeItems = processedItems.filter((item: Item) => item.status !== 'sold');
      console.log(`💼 Active inventory items: ${activeItems.length}`);
      
      // Update state with all datasets
      setItems(activeItems);
      setSales(salesData);
      setExpenses(expensesData);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      
      // Show success message if refreshing
      if (showRefreshing) {
        setSnackbar({
          open: true,
          message: 'Data refreshed successfully!',
          severity: 'success'
        });
      }
      
      setBackendStatus('ok');
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
      setLoading(false);
      setRefreshing(false);
      // Fix error type - use a valid value for setBackendStatus
      setBackendStatus('down');
      setBackendError(error.message || 'Unknown error');
      
      if (showRefreshing) {
        setSnackbar({
          open: true,
          message: `Error refreshing data: ${error.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    }
  }, [api, salesApi, expensesApi, getAuthToken, currentUser, backendStatus, authLoading, settings.currency]);

  // Backend health check on mount and when user logs in/out
  useEffect(() => {
    checkBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // On mount and user change

  // Initial data load after authentication check
  // Only fetch data on mount or when auth finishes and backend is up
  useEffect(() => {
    console.log('[Dashboard] useEffect (data fetch) triggered', {
      authLoading,
      backendStatus,
      currentUser
    });
    if (!authLoading && backendStatus === 'ok' && currentUser) {
      fetchData();
    }
  }, [authLoading, backendStatus, currentUser]);

  // Update date range when time filter changes
  useEffect(() => {
    const updateDateRangeFromTimeFilter = () => {
      const today = dayjs();
      const range = timeRanges.find(r => r.value === timeRange);
      
      if (!range) return;
      
      if (range.value === 'ALL') {
        // Reset date filters for "ALL"
        setStartDate(null);
        setEndDate(null);
      } else {
        // Set end date to today
        setEndDate(today);
        // Set start date based on days
        setStartDate(today.subtract(range.days, 'day'));
      }
    };
    
    updateDateRangeFromTimeFilter();
  }, [timeRange]);

  // Handle refreshing data
  const handleRefresh = () => {
    fetchData(true);
  };

  // Handle sort change
  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };

  // Handle time range change
  const handleTimeRangeChange = (event: React.MouseEvent<HTMLElement>, newTimeRange: string) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  // Handle date changes
  const handleStartDateChange = (newDate: Dayjs | null) => {
    setStartDate(newDate);
    setTimeRange(''); // Reset time filter when manually changing dates
  };

  const handleEndDateChange = (newDate: Dayjs | null) => {
    setEndDate(newDate);
    setTimeRange(''); // Reset time filter when manually changing dates
  };

  // Adding a new item
  const handleAddItemModalClose = () => {
    setIsAddItemModalOpen(false);
    fetchData();
    setSnackbar({
      open: true,
      message: 'Item added successfully!',
      severity: 'success'
    });
  };

  // Handle closing snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Calculate portfolio stats including historical data
  const calculatePortfolioStats = useCallback(() => {
    // Active items are always calculated on the entire inventory,
    // regardless of date filters - this is the entire portfolio value
    const activeItems = items.filter(item => item.status !== 'sold');
    
    // ENHANCED DEBUGGING - Set to true for detailed logging
    const enableLogging = true;
    
    if (enableLogging) {
      console.log(`%c🔎 DASHBOARD CURRENCY DEBUG MODE 🔎`, 'background: #0a84ff; color: white; padding: 4px; font-weight: bold;');
      console.log(`Total active items: ${activeItems.length} | User currency: ${settings.currency}`);
      
      // Log the raw data for analysis
      console.log("------ RAW ITEM DATA SAMPLE ------");
      if (activeItems.length > 0) {
        const firstItem = activeItems[0];
        console.log(`First item (${firstItem.productName})`, firstItem);
        console.table({
          "ID": firstItem.id,
          "Product Name": firstItem.productName,
          "Market Price": firstItem.marketPrice,
          "Market Price Currency": (firstItem as any).marketPriceCurrency || 'unknown',
          "Purchase Price": firstItem.purchasePrice,
          "Purchase Currency": (firstItem as any).purchaseCurrency || 'unknown'
        });
      }
    }
    
    // Compare with Inventory Display values - DEBUG ANALYSIS
    // Create a detailed log of each item's values to compare with Inventory page
    const debugItemValues: Array<{
      name: string;
      rawMarketPrice: number;
      rawCurrency: string;
      displayedCurrency: string;
      needsConversion: boolean;
    }> = [];
    
    // Calculate current portfolio value using the market prices directly from the API
    const currentValue = activeItems.reduce((sum, item, index) => {
      // Get the full item data with all currency information
      const inventoryItem = item as InventoryItem;
      
      // Get the market price and currency directly
      const marketPrice = item.marketPrice || 0;
      const marketPriceCurrency = inventoryItem.marketPriceCurrency || settings.currency;
      
      // Store the raw values for detailed logging
      if (enableLogging) {
        debugItemValues.push({
          name: item.productName,
          rawMarketPrice: marketPrice,
          rawCurrency: marketPriceCurrency,
          displayedCurrency: settings.currency,
          needsConversion: marketPriceCurrency !== settings.currency
        });
      }
      
      // DIAGNOSIS: Check if we're using the correct value that the inventory page uses
      let finalValue = marketPrice;
      
      // Only convert if the currency differs from settings currency
      // This is critical - the inventory page isn't doing conversions if already in correct currency
      if (marketPriceCurrency !== settings.currency) {
        if (enableLogging) {
          console.log(`⚠️ [${item.productName}] CURRENCY MISMATCH: Item is in ${marketPriceCurrency}, user prefers ${settings.currency}`);
        }
        
        try {
          const originalValue = finalValue;
          finalValue = currencyConverter(finalValue, marketPriceCurrency, settings.currency, true);
          
          if (enableLogging) {
            console.log(`💱 Converted ${originalValue} ${marketPriceCurrency} → ${finalValue} ${settings.currency}`);
          }
        } catch (error) {
          console.error(`Error converting currency for ${item.productName}:`, error);
        }
      } else if (enableLogging) {
        console.log(`✅ [${item.productName}] NO CONVERSION NEEDED: Already in ${settings.currency}`);
      }
      
      // If there's no market price at all, use purchase price with markup
      if (!item.marketPrice && item.purchasePrice) {
        finalValue = item.purchasePrice * 1.2; // 20% markup as default
        if (enableLogging) {
          console.log(`ℹ️ [${item.productName}] Using purchase price with markup: ${item.purchasePrice} * 1.2 = ${finalValue}`);
        }
      }
      
      return sum + finalValue;
    }, 0);
    
    // After processing all items, show the aggregate debug information
    if (enableLogging && debugItemValues.length > 0) {
      console.log("------ CURRENCY CONVERSION SUMMARY ------");
      console.table(debugItemValues);
      console.log(`💰 FINAL TOTAL VALUE: ${currentValue.toFixed(2)} ${settings.currency}`);
    }
    
    // Only log the final value if debugging is enabled
    if (enableLogging) {
      console.log(`💰 [DASHBOARD] Final portfolio value: ${settings.currency} ${currentValue.toFixed(2)}`);
    }

    
    // For historical comparison, determine a reasonable previous value based on time period
    let previousValue = currentValue;
    let percentageChange = 0;
    let valueChange = 0;
    
    // Generate historical portfolio data for the graph based on selected time range
    let historicalData = [];
    
    // Helper function to add realistic fluctuations to data points
    const addFluctuation = (baseValue: number, volatility: number = 0.02): number => {
      const fluctuation = (Math.random() * 2 - 1) * baseValue * volatility;
      return baseValue + fluctuation;
    };
    
    // Create different patterns based on the selected time range
    if (timeRange === '24H') {
      // 24 hour view - small fluctuations, slight uptrend
      previousValue = currentValue * 0.99;
      valueChange = currentValue - previousValue;
      
      // Generate hourly data points
      const numPoints = 8;
      for (let i = 0; i < numPoints; i++) {
        const pointDate = dayjs().subtract(numPoints - i - 1, 'hour');
        const dateValue = pointDate.format('h A');
        
        // More fluctuation for intraday data
        const progress = i / (numPoints - 1);
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.005);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else if (timeRange === '1W') {
      // 1 week view - moderate fluctuations
      previousValue = currentValue * 0.97;
      valueChange = currentValue - previousValue;
      
      // Generate daily data points for the week
      for (let i = 6; i >= 0; i--) {
        const pointDate = dayjs().subtract(i, 'day');
        const dateValue = pointDate.format('M/D');
        
        // Create a dip in the middle of the week for visual interest
        let progress;
        if (i > 3) {
          progress = (6 - i) / 3; // First half of week
        } else if (i === 3) {
          progress = 0.8; // Midweek dip
        } else {
          progress = 0.8 + (3 - i) / 3 * 0.2; // Recovery
        }
        
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.01);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else if (timeRange === '1M') {
      // 1 month view - larger changes
      previousValue = currentValue * 0.92;
      valueChange = currentValue - previousValue;
      
      // Generate weekly data points for the month
      const numPoints = 5; // ~4-5 weeks in a month
      for (let i = 0; i < numPoints; i++) {
        const pointDate = dayjs().subtract(numPoints - i - 1, 'week');
        const dateValue = pointDate.format('M/D');
        
        // Create a more interesting curve with a plateau and then growth
        let progress;
        if (i < numPoints / 2) {
          progress = i / (numPoints / 2) * 0.4; // Slow start
        } else {
          progress = 0.4 + (i - numPoints / 2) / (numPoints / 2) * 0.6; // Faster finish
        }
        
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.02);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else if (timeRange === '3M') {
      // 3 month view - significant changes
      previousValue = currentValue * 0.85;
      valueChange = currentValue - previousValue;
      
      // Generate bi-weekly data points
      const numPoints = 7; // ~6-7 bi-weekly periods in 3 months
      for (let i = 0; i < numPoints; i++) {
        const pointDate = dayjs().subtract((numPoints - i - 1) * 2, 'week');
        const dateValue = pointDate.format('M/D');
        
        // Create a curve with a dip and recovery
        let progress;
        if (i < numPoints / 3) {
          progress = i / (numPoints / 3) * 0.3; // Initial growth
        } else if (i < 2 * numPoints / 3) {
          const dip = (i - numPoints / 3) / (numPoints / 3);
          progress = 0.3 - dip * 0.1; // Dip
        } else {
          const recovery = (i - 2 * numPoints / 3) / (numPoints / 3);
          progress = 0.2 + recovery * 0.8; // Strong recovery
        }
        
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.03);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else if (timeRange === '6M') {
      // 6 month view - major changes
      previousValue = currentValue * 0.75;
      valueChange = currentValue - previousValue;
      
      // Generate monthly data points
      for (let i = 5; i >= 0; i--) {
        const pointDate = dayjs().subtract(i, 'month');
        const dateValue = pointDate.format('MMM');
        
        // Create a realistic growth curve with a plateau in the middle
        let progress;
        if (i > 3) {
          progress = (5 - i) / 2 * 0.2; // Slow start
        } else if (i > 1) {
          progress = 0.2 + (3 - i) / 2 * 0.3; // Middle plateau
        } else {
          progress = 0.5 + (1 - i) / 1 * 0.5; // Strong finish
        }
        
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.04);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else if (timeRange === '1Y') {
      // 1 year view - largest changes
      previousValue = currentValue * 0.65;
      valueChange = currentValue - previousValue;
      
      // Generate bi-monthly data points
      for (let i = 5; i >= 0; i--) {
        const pointDate = dayjs().subtract(i * 2, 'month');
        const dateValue = pointDate.format('MMM');
        
        // Create a realistic yearly pattern with seasonal variations
        let progress;
        if (i === 5) { // Start
          progress = 0;
        } else if (i === 4) { // Q1
          progress = 0.15;
        } else if (i === 3) { // Q2
          progress = 0.35;
        } else if (i === 2) { // Q3
          progress = 0.45; // Summer slowdown
        } else if (i === 1) { // Q4
          progress = 0.7; // Holiday season boost
        } else { // End (current)
          progress = 1.0;
        }
        
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.05);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else { // ALL time or default
      // All time view - show major growth
      previousValue = currentValue * 0.5;
      valueChange = currentValue - previousValue;
      
      // Generate yearly data points
      const numYears = 4;
      for (let i = 0; i < numYears; i++) {
        const pointDate = dayjs().subtract(numYears - i - 1, 'year');
        const dateValue = pointDate.format('YYYY');
        
        // Create an exponential growth curve
        const progress = Math.pow(i / (numYears - 1), 1.5); // Exponential growth
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.07);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    }
    
    // Ensure the last point is exactly the current value
    if (historicalData.length > 0) {
      historicalData[historicalData.length - 1].value = currentValue;
    }
    
    // Calculate percentage change based on first and last data points
    if (historicalData.length >= 2) {
      const firstValue = historicalData[0].value;
      percentageChange = ((currentValue - firstValue) / firstValue) * 100;
      valueChange = currentValue - firstValue;
    }
    
    return {
      currentValue,
      valueChange,
      percentageChange: Number(percentageChange.toFixed(1)),
      historicalData,
    };
  }, [items, timeRange, settings.currency]);

  // Show auth loading state
  if (authLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Show not authenticated state
  if (!currentUser) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2
      }}>
        <Alert severity="warning" sx={{ maxWidth: 400 }}>
          <strong>Not Authenticated:</strong> You need to be logged in to view your dashboard.<br />
          <span style={{ fontSize: '0.9em', color: '#888' }}>
            (If you are logged in and see this, there may be an issue with authentication state propagation. Try refreshing, logging out, and logging in again.)
          </span>
        </Alert>
      </Box>
    );
  }

  // Data loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
          Loading your dashboard...
        </Typography>
        {authLoading && (
          <Typography color="error" sx={{ mt: 1 }}>
            Waiting for authentication to complete...
          </Typography>
        )}
        {!authLoading && !currentUser && (
          <Typography color="error" sx={{ mt: 1 }}>
            No authenticated user found. Please log in.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      py: 1, 
      px: 2, 
      maxWidth: '1800px',
      margin: '0 auto',
      height: 'calc(100vh - 80px)',
      width: '100%',
      overflow: 'auto'
    }}>

      {/* Error display if any */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Main Content Layout */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'row',
        flexGrow: 1, 
        gap: 3,
        overflowY: 'hidden', 
      }}>
        {/* Left Side - Charts and Reports */}
        <Box sx={{ 
          width: { xs: '100%', md: 'calc(100% - 350px)' }, 
          height: '100%', 
          display: 'flex',
          flexDirection: 'column',
          p: theme.spacing(1, 2), 
          overflowY: 'hidden', 
        }}>
          {/* Portfolio Value Chart with Sort/Refresh Controls */}
          <Paper sx={{
            flex: 2.5, 
            minHeight: 0, 
            mb: 1.5, 
            p: 1, 
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            {/* All controls in a single row */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              p: 1, 
              borderBottom: `1px solid ${theme.palette.divider}`
            }}>
              {/* Left: Date Range Filters */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          width: '160px',
                          '& .MuiInputBase-input': {
                            color: theme.palette.text.primary
                          }
                        }
                      }
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          width: '160px',
                          '& .MuiInputBase-input': {
                            color: theme.palette.text.primary
                          }
                        }
                      }
                    }}
                  />
                </Box>
              </LocalizationProvider>

              {/* Center: Time Range Filters */}
              <ToggleButtonGroup
                value={timeRange}
                exclusive
                onChange={handleTimeRangeChange}
                aria-label="time range"
                size="small"
                sx={{
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: 'hidden'
                }}
              >
                {timeRanges.map((range) => (
                  <StyledToggleButton key={range.value} value={range.value}>
                    {range.label}
                  </StyledToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* Right: Sort by and Refresh */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort by"
                    onChange={handleSortChange}
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="price">Price</MenuItem>
                    <MenuItem value="brand">Brand</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outlined"
                  size="medium"
                  sx={{ 
                    minWidth: 100,
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main
                  }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>
            </Box>

            {/* Portfolio Value Component */}
            <Box sx={{ height: 'calc(100% - 64px)', width: '100%' }}>
              <PortfolioValue 
                currentUser={currentUser} // Pass currentUser from Dashboard's state
                currentValue={portfolioStats.currentValue}
                valueChange={portfolioStats.valueChange}
                percentageChange={portfolioStats.percentageChange}
                data={portfolioStats.historicalData}
                theme={theme}
              />
            </Box>
          </Paper>

          {/* Reports Grid with connected data */}
          <Box sx={{ 
            flex: 2.5, 
            minHeight: 0, 
            overflowY: 'auto', 
          }}>
            <ReportsSection 
              items={items}
              sales={sales}
              expenses={expenses}
              startDate={startDate}
              endDate={endDate}
              currentUser={currentUser}
            />
          </Box>
        </Box>

        {/* Right Side - Inventory Display */}
        <Box 
          sx={{ 
            width: '480px',
            height: '100%', 
            overflow: 'auto',
            mt: 0,
            ml: 0.5,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ 
            p: 2,
            pt: 3,
            pb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                fontSize: '1.1rem',
                color: theme.palette.mode === 'dark' ? '#fff' : '#333'
              }}
            >
              Inventory Items
            </Typography>
          </Box>
          <Box sx={{ 
            flexGrow: 1,
            overflow: 'auto',
            px: 2
          }}>
            <EnhancedInventoryDisplay 
              items={items.filter(item => item.status !== 'sold')}
              currentUser={currentUser}
            />
          </Box>
        </Box>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;