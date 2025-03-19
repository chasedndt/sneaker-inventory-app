import React, { useEffect, useState, useCallback } from 'react';
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
  IconButton
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { api, Item } from '../services/api';
import { salesApi, Sale } from '../services/salesApi';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';
import EnhancedInventoryDisplay from '../components/EnhancedInventoryDisplay';
import dayjs, { Dayjs } from 'dayjs';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });

  // Fetch items and sales from API
  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔄 Fetching inventory items and sales data...');
      
      // Fetch items data
      const itemsData = await api.getItems();
      
      // Filter out sold items for active inventory
      const activeItems = itemsData.filter((item: Item) => item.status !== 'sold');
      console.log(`✅ Received ${activeItems.length} active items from API`);
      
      // Fetch sales data
      const salesData = await salesApi.getSales();
      console.log(`✅ Received ${salesData.length} sales records from API`);
      
      // Update state with both datasets
      setItems(activeItems);
      setSales(salesData);
      setError(null);
      
      // Show success message if refreshing
      if (showRefreshing) {
        setSnackbar({
          open: true,
          message: 'Dashboard data refreshed successfully',
          severity: 'success'
        });
      }
    } catch (err: any) {
      console.error('💥 Error fetching data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
      setSnackbar({
        open: true,
        message: `Error loading data: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refreshing data
  const handleRefresh = () => {
    fetchData(true);
  };

  // Handle adding a new item
  const handleAddItemModalClose = () => {
    setIsAddItemModalOpen(false);
    fetchData();
    setSnackbar({
      open: true,
      message: 'Item added successfully!',
      severity: 'success'
    });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Filter data based on date range
  const getFilteredData = () => {
    // First filter active items based on date range
    let filteredItems = [...items];
    let filteredSales = [...sales];
    
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
    }
    
    return { filteredItems, filteredSales };
  };

  // Calculate portfolio stats with real, live data
  const calculatePortfolioStats = () => {
    const { filteredItems, filteredSales } = getFilteredData();
    
    // Current portfolio value (sum of market prices for all active inventory)
    const currentValue = filteredItems.reduce((sum, item) => {
      // Use market price if available, otherwise estimate as 20% more than purchase price
      const marketPrice = item.marketPrice || (item.purchasePrice * 1.2);
      return sum + marketPrice;
    }, 0);
    
    // Calculate previous value (using the previous week's data)
    // For this demo, using 5% down from current as previous value
    const previousValue = currentValue * 0.95;
    
    const valueChange = currentValue - previousValue;
    const percentageChange = previousValue === 0 ? 0 : (valueChange / previousValue) * 100;
    
    // Get historical portfolio value data (for the graph)
    const historicalData = generateHistoricalPortfolioData(filteredItems, filteredSales);
    
    return {
      currentValue,
      valueChange,
      percentageChange: Number(percentageChange.toFixed(1)),
      historicalData
    };
  };
  
  // Generate historical portfolio data for the graph
  const generateHistoricalPortfolioData = (filteredItems: Item[], filteredSales: Sale[]) => {
    // If date range is set, use it for the graph, otherwise generate the last 6 data points
    const today = dayjs();
    const numberOfPoints = 6;
    const pointsArray = [];
    
    // Create data points based on filtered data
    if (startDate && endDate) {
      // Calculate range for even distribution
      const totalDays = endDate.diff(startDate, 'day');
      const interval = Math.max(1, Math.floor(totalDays / (numberOfPoints - 1)));
      
      for (let i = 0; i < numberOfPoints; i++) {
        const pointDate = startDate.add(i * interval, 'day');
        if (pointDate.isAfter(endDate)) break;
        
        const dateValue = pointDate.format('M/D');
        
        // Calculate portfolio value at this point in time
        const pointValue = calculateValueAtPoint(pointDate, filteredItems, filteredSales);
        
        pointsArray.push({ date: dateValue, value: pointValue });
      }
    } else {
      // Generate last 6 data points (past weeks)
      for (let i = 5; i >= 0; i--) {
        const pointDate = today.subtract(i * 7, 'day');
        const dateValue = pointDate.format('M/D');
        
        // Calculate portfolio value at this point in time
        const pointValue = calculateValueAtPoint(pointDate, items, sales);
        
        pointsArray.push({ date: dateValue, value: pointValue });
      }
    }
    
    return pointsArray;
  };
  
  // Helper to calculate portfolio value at a specific point in time
  const calculateValueAtPoint = (date: Dayjs, itemsList: Item[], salesList: Sale[]) => {
    const targetDate = date.endOf('day');
    
    // Get items that were purchased before or on the target date
    const itemsBeforeDate = itemsList.filter(item => {
      const purchaseDate = dayjs(item.purchaseDate);
      return purchaseDate.isBefore(targetDate) || purchaseDate.isSame(targetDate, 'day');
    });
    
    // Get sales that happened before or on the target date
    const salesBeforeDate = salesList.filter(sale => {
      const saleDate = dayjs(sale.saleDate);
      return saleDate.isBefore(targetDate) || saleDate.isSame(targetDate, 'day');
    });
    
    // Calculate total value of active items at this point
    let totalValue = 0;
    
    // Add value of items that were purchased before this date and not sold
    for (const item of itemsBeforeDate) {
      // Skip items that were sold before this date
      const isItemSold = salesBeforeDate.some(sale => sale.itemId === item.id);
      if (!isItemSold) {
        // Use market price if available, otherwise estimate as 20% more than purchase price
        const marketPrice = item.marketPrice || (item.purchasePrice * 1.2);
        totalValue += marketPrice;
      }
    }
    
    return Math.round(totalValue);
  };

  // Loading state
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
      </Box>
    );
  }

  // Calculate portfolio stats including historical data
  const portfolioStats = calculatePortfolioStats();

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      p: { xs: 2, md: 3 },
      maxWidth: '1800px',
      margin: '0 auto',
      height: 'calc(100vh - 80px)', // Set a fixed height to fit within screen
      overflow: 'hidden' // Prevent scrolling
    }}>
      {/* Main Content - Left Side */}
      <Box sx={{ 
        flex: '1 1 auto',
        mr: { xs: 0, md: 3 },
        maxWidth: { xs: '100%', md: 'calc(100% - 350px)' },
        height: '100%',
        overflow: 'hidden' // Prevent scrolling
      }}>
        {/* Date Range Picker with improved visibility */}
        <Paper sx={{ 
          p: '16px 24px', 
          borderRadius: 2, 
          mb: 3,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          '& .MuiInputBase-root': {
            color: theme.palette.text.primary
          },
          '& .MuiInputLabel-root': {
            color: theme.palette.text.secondary
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider
          },
          '& .MuiSvgIcon-root': {
            color: theme.palette.text.secondary
          }
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      sx: {
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
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      sx: {
                        '& .MuiInputBase-input': {
                          color: theme.palette.text.primary
                        }
                      }
                    }
                  }}
                />
              </Box>
            </LocalizationProvider>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outlined"
              sx={{ 
                minWidth: 120,
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Paper>

        {/* Portfolio Value Chart with real data */}
        <PortfolioValue 
          currentValue={portfolioStats.currentValue}
          valueChange={portfolioStats.valueChange}
          percentageChange={portfolioStats.percentageChange}
          data={portfolioStats.historicalData}
          theme={theme}
        />

        {/* Reports Grid with connected data */}
        <Box sx={{ mt: 3 }}>
          <ReportsSection 
            items={items}
            sales={sales}
            startDate={startDate}
            endDate={endDate}
          />
        </Box>
      </Box>

      {/* Inventory Display - Right Side */}
      <Box 
        sx={{ 
          width: { xs: '100%', md: '350px' },
          flex: '0 0 auto',
          display: { xs: 'none', md: 'block' },
          height: '100%',
          overflow: 'auto' // Allow scrolling just for this section if needed
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          pl: 1
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 600
            }}
          >
            Your Inventory
          </Typography>
        </Box>
        <EnhancedInventoryDisplay 
          items={items.filter(item => item.status !== 'sold')}
        />
      </Box>

      {/* Mobile Inventory Display - Only shown on small screens */}
      <Box 
        sx={{ 
          width: '100%', 
          mt: 3,
          display: { xs: 'block', md: 'none' }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          pl: 1
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 600
            }}
          >
            Your Inventory
          </Typography>
        </Box>
        <EnhancedInventoryDisplay 
          items={items.filter(item => item.status !== 'sold')}
        />
      </Box>

      {/* Add Item Floating Button */}
      <Fab 
        color="primary" 
        aria-label="add item"
        onClick={() => setIsAddItemModalOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          bgcolor: '#8884d8',
          '&:hover': {
            bgcolor: '#7773c7'
          }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Add Item Modal */}
      <AddItemModal 
        open={isAddItemModalOpen}
        onClose={handleAddItemModalClose}
      />

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