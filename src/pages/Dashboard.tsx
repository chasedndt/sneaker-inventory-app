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
  Fab // Added for floating action button
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
import AddIcon from '@mui/icons-material/Add'; // Added for FAB icon
import { fetchDashboardData, DashboardData } from '../services/dashboardService';
import InventorySection from '../components/InventorySection';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';
import AddItemModal from '../components/AddItemModal'; // New import for Add Item modal

// Mock data for profit breakdown chart
// TODO: Replace with real data from backend when implemented
const profitData = [
  { name: 'Jan', profit: 3400, expenses: 2450, net: 950 },
  { name: 'Feb', profit: 2800, expenses: 1600, net: 1200 },
  { name: 'Mar', profit: 1900, expenses: 4500, net: -2600 },
  { name: 'Apr', profit: 2780, expenses: 3200, net: -420 },
  { name: 'May', profit: 1890, expenses: 3100, net: -1210 },
  { name: 'Jun', profit: 2390, expenses: 3000, net: -610 },
  { name: 'Jul', profit: 3090, expenses: 3200, net: -110 },
  { name: 'Aug', profit: 2800, expenses: 3100, net: -300 },
  { name: 'Sep', profit: 3200, expenses: 3300, net: -100 },
  { name: 'Oct', profit: 3800, expenses: 3000, net: 800 },
  { name: 'Nov', profit: 3200, expenses: 3100, net: 100 },
  { name: 'Dec', profit: 3900, expenses: 3000, net: 900 }
];

const Dashboard: React.FC = () => {
  // State management
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  // New state for Add Item modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchDashboardData();
        setData(result);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Loading state handler
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state handler
  if (!data) {
    return (
      <Box>
        <Typography>Error loading dashboard data.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1600px',
      width: '100%'
    }}>
      {/* Date Range Selector */}
      <Paper sx={{ 
        p: '16px 24px',
        borderRadius: 2,
        bgcolor: '#fff'
      }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Start date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="End date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <ButtonGroup variant="outlined" fullWidth sx={{ height: '40px' }}>
              <Button>LAST WEEK</Button>
              <Button>LAST MONTH</Button>
              <Button>6 MONTHS</Button>
              <Button>1 YEAR</Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Portfolio Value Display */}
      <PortfolioValue 
        currentValue={99129.00} // TODO: Replace with dynamic value from backend
        valueChange={22324.19}
        percentageChange={29.07}
      />

      {/* Profit Breakdown Chart */}
      <Paper sx={{ 
        p: 3, 
        mb: 3,
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <Typography variant="h6" gutterBottom>Profit Breakdown</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={profitData}
            margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length >= 2) {
                  const profit = Number(payload[0].value || 0);
                  const expenses = Number(payload[1].value || 0);
                  const net = profit - expenses;
                  return (
                    <Box sx={{ 
                      bgcolor: '#fff', 
                      p: 1.5,
                      borderRadius: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: '1px solid #e0e0e0'
                    }}>
                      <Typography variant="body2">Profit: ${profit}</Typography>
                      <Typography variant="body2">Expenses: ${expenses}</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: net >= 0 ? '#4CAF50' : '#f44336',
                          fontWeight: 600
                        }}
                      >
                        Net: ${net >= 0 ? '+' : ''}{net}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar 
              dataKey="profit" 
              fill="#8884d8" 
              radius={[4, 4, 0, 0]}
              name="Profit"
            />
            <Bar 
              dataKey="expenses" 
              fill="#4CAF50" 
              radius={[4, 4, 0, 0]}
              name="Expenses"
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Reports Section */}
      <ReportsSection />

      {/* Inventory Section */}
      <InventorySection />

      {/* Floating Action Button for Adding Items */}
      <Fab 
        color="primary" 
        aria-label="add item"
        onClick={() => setIsAddItemModalOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          bgcolor: '#8884d8', // Match Scout's purple theme
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
