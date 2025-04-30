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
import { useApi, Item } from '../services/api';
import { salesApi, Sale } from '../services/salesApi';
import { expensesApi } from '../services/expensesApi';
import { Expense } from '../models/expenses';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';
import EnhancedInventoryDisplay from '../components/EnhancedInventoryDisplay';
import dayjs, { Dayjs } from 'dayjs';
import { debugNetProfitFromSoldItems } from '../utils/profitCalculator';

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


  // Fetch items, sales, and expenses from API with authentication
  // Memoized fetchData, only depends on stable references
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
      const token = await getAuthToken();
      if (!token) {
        console.error('[Dashboard] No auth token found.');
        setError('Authentication token could not be retrieved. Please log out and log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        // Fetch items data
        const itemsData = await api.getItems();
        
        // Filter out sold items for active inventory
        const activeItems = itemsData.filter((item: Item) => item.status !== 'sold');
        console.log(`✅ Received ${activeItems.length} active items from API for user ${currentUser.uid}`);
        
        // Fetch sales data
        const salesData = await salesApi.getSales();
        console.log(`✅ Received ${salesData.length} sales records from API for user ${currentUser.uid}`);
        
        // Debug sales data
        console.log('📊 Sales data:', salesData);
        
        // Fetch expenses data
        const expensesData = await expensesApi.getExpenses();
        console.log(`✅ Received ${expensesData.length} expense records from API for user ${currentUser.uid}`);
        
        // Debug expenses data
        console.log('💰 Expenses data:', expensesData);
        
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
            message: 'Dashboard data refreshed successfully',
            severity: 'success'
          });
        }
      } catch (error: any) {
        console.error('[Dashboard] Error fetching dashboard data:', error);
        setError('Error fetching dashboard data: ' + (error.message || error.toString()));
        setLoading(false);
        setRefreshing(false);
      }
    } catch (error: any) {
      console.error('[Dashboard] Error during fetchData:', error);
      setError('Error during fetchData: ' + (error.message || error.toString()));
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, salesApi, expensesApi, getAuthToken, currentUser, backendStatus]);

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
  const calculatePortfolioStats = () => {
    // Active items are always calculated on the entire inventory,
    // regardless of date filters - this is the entire portfolio value
    const activeItems = items.filter(item => item.status !== 'sold');
    
    // Calculate current portfolio value (sum of market prices for all active inventory)
    const currentValue = activeItems.reduce((sum, item) => {
      // Use market price if available, otherwise estimate as 20% more than purchase price
      const marketPrice = item.marketPrice || (item.purchasePrice * 1.2);
      return sum + marketPrice;
    }, 0);
    
    // For historical comparison, we still use the date range to estimate growth
    let previousValue = currentValue * 0.95; // Default fallback
    
    // If we have a date range, try to calculate a more accurate previous value
    if (startDate && endDate) {
      // Calculate time difference in days
      const daysDifference = endDate.diff(startDate, 'day');
      
      // For periods longer than 7 days, use a more significant historical difference
      if (daysDifference >= 7) {
        previousValue = currentValue * 0.92; // 8% difference for longer periods
      } else if (daysDifference >= 30) {
        previousValue = currentValue * 0.85; // 15% difference for monthly view
      }
    }
    
    const valueChange = currentValue - previousValue;
    const percentageChange = previousValue === 0 ? 0 : (valueChange / previousValue) * 100;
    
    // Generate historical portfolio data for the graph
    // This should use real data in production
    let historicalData = [];
    
    if (startDate && endDate) {
      // Calculate range for even distribution
      const totalDays = endDate.diff(startDate, 'day');
      const numPoints = Math.min(7, totalDays + 1); // Maximum 7 points on the graph
      const interval = Math.max(1, Math.floor(totalDays / (numPoints - 1)));
      
      for (let i = 0; i < numPoints; i++) {
        const pointDate = startDate.add(i * interval, 'day');
        if (pointDate.isAfter(endDate)) break;
        
        const dateValue = pointDate.format('M/D');
        
        // Calculate portfolio value at this point in time
        // For demo purposes, using simple interpolation
        // In production, you'd calculate actual value at each date
        const progress = i / (numPoints - 1);
        const pointValue = previousValue + progress * valueChange;
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    } else {
      // Default 6 data points for the last 6 months
      const today = dayjs();
      for (let i = 5; i >= 0; i--) {
        const pointDate = today.subtract(i, 'month');
        const dateValue = pointDate.format('M/D');
        
        // Generate a reasonable growth curve for demo
        const progress = (5 - i) / 5;
        const pointValue = previousValue + progress * valueChange;
        
        historicalData.push({ date: dateValue, value: pointValue });
      }
    }
    
    return {
      currentValue,
      valueChange,
      percentageChange: Number(percentageChange.toFixed(1)),
      historicalData
    };
  };

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
      p: { xs: 2, md: 3 },
      maxWidth: '1800px',
      margin: '0 auto',
      height: 'calc(100vh - 80px)',
      width: '100%',
      overflow: 'auto'
    }}>
      {/* Header and Date Range Picker */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          mb: 3
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            color: theme.palette.mode === 'dark' ? 'white' : 'text.primary',
            fontWeight: 600,
          }}
        >
          Dashboard
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
              minWidth: 120,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

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
        flexDirection: { xs: 'column', md: 'row' },
        height: 'calc(100% - 60px)',
        width: '100%'
      }}>
        {/* Left Side - Charts and Reports */}
        <Box sx={{ 
          flex: '1 1 auto',
          mr: { xs: 0, md: 3 },
          mb: { xs: 3, md: 0 },
          width: { xs: '100%', md: 'calc(100% - 350px)' },
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Portfolio Value Chart with real data - Increased Height */}
          <Paper sx={{ height: '380px', mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            {/* Date filters and time range filters */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              p: 2, 
              borderBottom: `1px solid ${theme.palette.divider}`
            }}>
              {/* Date Range Filters - Now positioned on the left */}
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

              {/* Time Range Filters */}
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
            </Box>

            {/* Portfolio Value Component */}
            <Box sx={{ height: 'calc(100% - 64px)', width: '100%' }}>
              <PortfolioValue 
                currentValue={calculatePortfolioStats().currentValue}
                valueChange={calculatePortfolioStats().valueChange}
                percentageChange={calculatePortfolioStats().percentageChange}
                data={calculatePortfolioStats().historicalData}
                theme={theme}
              />
            </Box>
          </Paper>

          {/* Reports Grid with connected data */}
          <Box sx={{ flex: 1 }}>
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
            width: { xs: '100%', md: '350px' },
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto'
          }}
        >
          <Box sx={{ 
            height: '100%',
            overflow: 'auto'
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