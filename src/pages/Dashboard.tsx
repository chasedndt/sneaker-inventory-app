// src/pages/Dashboard.tsx - with fixed unused variable warnings
import React, { useEffect, useState } from 'react';
import { 
  Box,
  Typography, 
  CircularProgress,
  Fab,
  Paper
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import { api, Item } from '../services/api';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';
import EnhancedInventoryDisplay from '../components/EnhancedInventoryDisplay';

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<null | Date>(null);
  const [endDate, setEndDate] = useState<null | Date>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Calculate portfolio values from real data
  const calculatePortfolioValues = (items: Item[]) => {
    const currentValue = items.reduce((sum, item) => sum + item.purchasePrice, 0);
    const previousValue = currentValue * 0.8; // Example calculation
    const valueChange = currentValue - previousValue;
    const percentageChange = (valueChange / previousValue) * 100;

    return {
      currentValue,
      valueChange,
      percentageChange
    };
  };

  // Fetch real data from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await api.getItems();
        setItems(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const portfolioStats = calculatePortfolioValues(items);

  return (
    <Box sx={{ 
      display: 'flex',
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
        onClose={() => setIsAddItemModalOpen(false)}
      />
    </Box>
  );
};

export default Dashboard;