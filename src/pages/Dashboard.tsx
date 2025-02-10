// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import { 
  Paper, 
  Typography, 
  Box,
  ButtonGroup,
  Button,
  CircularProgress,
  Fab
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import { api, Item } from '../services/api';
import InventorySection from '../components/InventorySection';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal';

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
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

  // Calculate profit data from real items
  const calculateProfitData = (items: Item[]) => {
    // Group items by month and calculate profits
    const monthlyData = items.reduce((acc, item) => {
      const month = new Date(item.purchaseDate).toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { profit: 0, expenses: item.purchasePrice };
      } else {
        acc[month].expenses += item.purchasePrice;
      }
      return acc;
    }, {} as Record<string, { profit: number; expenses: number }>);

    return Object.entries(monthlyData).map(([name, data]) => ({
      name,
      profit: data.profit,
      expenses: data.expenses,
      net: data.profit - data.expenses
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const portfolioStats = calculatePortfolioValues(items);
  const profitData = calculateProfitData(items);

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1600px',
      width: '100%'
    }}>
      <Paper sx={{ p: '16px 24px', borderRadius: 2, bgcolor: '#fff' }}>
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

      <PortfolioValue 
        currentValue={portfolioStats.currentValue}
        valueChange={portfolioStats.valueChange}
        percentageChange={portfolioStats.percentageChange}
      />

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" gutterBottom>Profit Breakdown</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={profitData}
            margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="expenses" fill="#8884d8" name="Expenses" />
            <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
            <Bar dataKey="net" fill="#ffc658" name="Net" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <ReportsSection />

      <InventorySection items={items} />

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

      <AddItemModal 
        open={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
      />
    </Box>
  );
};

export default Dashboard;
