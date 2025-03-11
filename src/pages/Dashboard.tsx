// src/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box,
  Typography, 
  CircularProgress,
  Fab,
  Paper,
  Snackbar,
  Alert,
  Button
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api, Item } from '../services/api';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';
import EnhancedInventoryDisplay from '../components/EnhancedInventoryDisplay';

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<null | Date>(null);
  const [endDate, setEndDate] = useState<null | Date>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });

  // Calculate portfolio values from real data
  const calculatePortfolioValues = (items: Item[]) => {
    console.log('📊 Calculating portfolio statistics...');
    const currentValue = items.reduce((sum, item) => sum + item.purchasePrice, 0);
    const previousValue = currentValue * 0.95; // Example calculation (5% growth assumed)
    const valueChange = currentValue - previousValue;
    const percentageChange = previousValue === 0 ? 0 : (valueChange / previousValue) * 100;

    return {
      currentValue,
      valueChange,
      percentageChange: Number(percentageChange.toFixed(1))
    };
  };

  // Fetch items from API
  const fetchItems = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔄 Fetching inventory items...');
      const data = await api.getItems();
      console.log(`✅ Received ${data.length} items from API`);
      
      setItems(data);
      setError(null);
      
      // Show success message if refreshing
      if (showRefreshing) {
        setSnackbar({
          open: true,
          message: 'Inventory refreshed successfully',
          severity: 'success'
        });
      }
    } catch (err: any) {
      console.error('💥 Error fetching items:', err);
      setError(`Failed to load inventory data: ${err.message}`);
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
    fetchItems();
  }, [fetchItems]);

  // Handle refreshing data
  const handleRefresh = () => {
    fetchItems(true);
  };

  // Handle adding a new item
  const handleAddItemModalClose = () => {
    setIsAddItemModalOpen(false);
    fetchItems();
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
        <Typography color="text.secondary">Loading your inventory...</Typography>
      </Box>
    );
  }

  const portfolioStats = calculatePortfolioValues(items);

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      p: { xs: 2, md: 3 },
      maxWidth: '1800px',
      margin: '0 auto'
    }}>
      {/* Main Content - Left Side */}
      <Box sx={{ 
        flex: '1 1 auto',
        mr: { xs: 0, md: 3 },
        maxWidth: { xs: '100%', md: 'calc(100% - 350px)' }
      }}>
        {/* Date Range Picker */}
        <Paper sx={{ p: '16px 24px', borderRadius: 2, bgcolor: '#fff', mb: 3 }}>
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
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                />
              </Box>
            </LocalizationProvider>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outlined"
              sx={{ minWidth: 120 }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Paper>

        {/* Portfolio Value Chart */}
        <PortfolioValue 
          currentValue={portfolioStats.currentValue}
          valueChange={portfolioStats.valueChange}
          percentageChange={portfolioStats.percentageChange}
        />

        {/* Reports Grid */}
        <Box sx={{ mt: 3 }}>
          <ReportsSection />
        </Box>
      </Box>

      {/* Inventory Display - Right Side */}
      <Box 
        sx={{ 
          width: { xs: '100%', md: '350px' },
          flex: '0 0 auto',
          display: { xs: 'none', md: 'block' }
        }}
      >
        <EnhancedInventoryDisplay items={items} />
      </Box>

      {/* Mobile Inventory Display - Only shown on small screens */}
      <Box 
        sx={{ 
          width: '100%', 
          mt: 3,
          display: { xs: 'block', md: 'none' }
        }}
      >
        <EnhancedInventoryDisplay items={items} />
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