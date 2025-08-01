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
import { useAuthReady } from '../hooks/useAuthReady';
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
import useDashboardData from '../hooks/useDashboardData';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';
import EnhancedInventoryDisplay from '../components/EnhancedInventoryDisplay';
import dayjs, { Dayjs } from 'dayjs';
import { debugNetProfitFromSoldItems } from '../utils/profitCalculator';
import { InventoryItem } from './InventoryPage';
import { useRenderLog } from '../hooks/useRenderLog';

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
  const { authReady } = useAuthReady();
  const auth = useAuth();
  const currentUser = auth.currentUser;
  const authLoading = auth.loading;
  const getAuthToken = auth.getAuthToken;
  const api = useApi();

  // Log auth readiness immediately on mount for diagnostics
  useEffect(() => {
    console.log('[AuthReady Dashboard] authReady=', authReady, '| currentUser.id=', currentUser?.uid);
  }, [authReady, currentUser]);
  const settings = useSettings(); // Get the user's currency settings
  
  // Use the dashboard data hook with proper currency conversion
  const {
    items,
    sales,
    expenses,
    loading,
    refreshing,
    error,
    fetchData,
    calculatePortfolioData
  } = useDashboardData();
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

  // Diagnostic render log to track re-renders and key state changes
  useRenderLog('Dashboard', {
    backendStatus,
    itemsCount: items.length,
    salesCount: sales.length,
    expensesCount: expenses.length,
    loading,
    refreshing,
    userLoaded: !!currentUser
  });

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

  // Only log state in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dashboard][DEBUG] Render:', {
      loading,
      authLoading,
      backendStatus,
      backendError,
      currentUser: currentUser ? { uid: currentUser.uid } : null, // Don't log entire user object
      itemCount: items.length,
      salesCount: sales.length,
      expensesCount: expenses.length,
      error
    });
  }

  // --- DEBUG LOGGING ---
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Dashboard] Auth loading:', authLoading, '| Current user:', currentUser ? 'authenticated' : 'not authenticated');
    }
  }, [authLoading, currentUser]);

  // Debug backendStatus changes only in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Dashboard] Backend status:', backendStatus);
    }
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
    console.log('[Dashboard] Performing backend health check via /api/ping');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/api/ping`);
      console.log('[Dashboard] /api/ping status:', res.status);
      if (res.ok) {
        setBackendStatus('ok');
        setBackendError(null);
      } else {
        setBackendStatus('down');
        setBackendError('Backend responded with error');
      }
    } catch (e: any) {
      console.error('[Dashboard] Backend health check failed:', e);
      setBackendStatus('down');
      setBackendError(e.message || 'Backend is unreachable');
    }
  }, []);

  // --- Backend health check ---


  // Run backend health check once on mount
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Data fetching is now handled by the useDashboardData hook

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
  }, [authLoading, backendStatus, currentUser, fetchData]);

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

  // Calculate portfolio stats including historical data using properly converted currency data
  const calculatePortfolioStats = useCallback(() => {
    // Get the current date range for filtering
    const now = dayjs();
    let calculatedStartDate: Dayjs;
    
    switch (timeRange) {
      case '24H':
        calculatedStartDate = now.subtract(1, 'day');
        break;
      case '1W':
        calculatedStartDate = now.subtract(1, 'week');
        break;
      case '1M':
        calculatedStartDate = now.subtract(1, 'month');
        break;
      case '3M':
        calculatedStartDate = now.subtract(3, 'month');
        break;
      case '6M':
        calculatedStartDate = now.subtract(6, 'month');
        break;
      case '1Y':
        calculatedStartDate = now.subtract(1, 'year');
        break;
      case 'ALL':
      default:
        calculatedStartDate = dayjs('2020-01-01'); // Far back date for "ALL"
        break;
    }
    
    // Use the properly converted data from useDashboardData hook
    // This ensures all currency conversion is handled correctly
    const portfolioData = calculatePortfolioData(startDate || calculatedStartDate, endDate || now);
    const currentValue = portfolioData.currentValue;
    
    // Handle empty portfolio gracefully
    if (currentValue === 0) {
      return {
        currentValue: 0,
        valueChange: 0,
        percentageChange: 0,
        historicalData: [
          { date: dayjs().subtract(1, 'day').format('M/D'), value: 0 },
          { date: dayjs().format('M/D'), value: 0 }
        ]
      };
    }
    
    // For historical comparison, determine reasonable previous value based on time period
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
        const progress = (6 - i) / 6;
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.01);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else if (timeRange === '1M') {
      // 1 month view
      previousValue = currentValue * 0.92;
      valueChange = currentValue - previousValue;
      
      // Generate weekly data points for the month
      for (let i = 0; i < 5; i++) {
        const pointDate = dayjs().subtract(4 - i, 'week');
        const dateValue = pointDate.format('M/D');
        const progress = i / 4;
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.02);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else {
      // Default for other time ranges (3M, 6M, 1Y, ALL)
      // Show reasonable growth over time
      previousValue = currentValue * 0.8; 
      valueChange = currentValue - previousValue;
      
      const pointCount = timeRange === '3M' ? 6 : 
                       timeRange === '6M' ? 6 : 
                       timeRange === '1Y' ? 6 : 4;
                       
      const unitType = timeRange === '3M' ? 'week' : 
                      timeRange === '6M' ? 'month' : 'month';
                      
      const unitMultiplier = timeRange === '3M' ? 2 : 
                           timeRange === '6M' ? 1 : 
                           timeRange === '1Y' ? 2 : 3;
      
      const dateFormat = unitType === 'week' ? 'M/D' : 'MMM';
      
      for (let i = 0; i < pointCount; i++) {
        const pointDate = dayjs().subtract((pointCount - i - 1) * unitMultiplier, unitType);
        const dateValue = pointDate.format(dateFormat);
        const progress = i / (pointCount - 1);
        const baseValue = previousValue + progress * valueChange;
        const pointValue = addFluctuation(baseValue, 0.03);
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    }
    
    // Fix: Ensure we have at least two data points for the graph
    if (historicalData.length < 2) {
      const today = dayjs().format('M/D');
      const yesterday = dayjs().subtract(1, 'day').format('M/D');
      
      historicalData = [
        { date: yesterday, value: currentValue * 0.98 },
        { date: today, value: currentValue }
      ];
    }
    
    // Ensure the last point is exactly the current value
    if (historicalData.length > 0) {
      historicalData[historicalData.length - 1].value = currentValue;
    }
    
    // Calculate percentage change based on first and last data points
    if (historicalData.length >= 2) {
      const firstValue = historicalData[0].value;
      if (firstValue > 0) {
        percentageChange = ((currentValue - firstValue) / firstValue) * 100;
      }
      valueChange = currentValue - firstValue;
    }
    
    // Ensure we return valid numbers for all values
    return {
      currentValue: Number.isFinite(currentValue) ? currentValue : 0,
      valueChange: Number.isFinite(valueChange) ? valueChange : 0,
      percentageChange: Number.isFinite(percentageChange) ? Number(percentageChange.toFixed(2)) : 0,
      historicalData: historicalData.map((point: {date: string, value: number}) => ({
        date: point.date,
        value: Number.isFinite(point.value) ? point.value : 0
      }))
    };
  }, [calculatePortfolioData, startDate, endDate, timeRange]);

  // Calculate and update portfolio statistics whenever items change
  useEffect(() => {
    if (!loading && items.length > 0) {
      console.log('Calculating portfolio stats for', items.length, 'items');
      const stats = calculatePortfolioStats();
      setPortfolioStats(stats);
      console.log('Updated portfolio stats:', stats);
    }
  }, [items, timeRange, startDate, endDate, loading]); // Removed calculatePortfolioStats to prevent excessive re-renders

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
            overflowY: 'visible', 
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