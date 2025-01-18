// Import necessary dependencies
import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import { 
  Paper, 
  Typography, 
  Box,
  ButtonGroup,
  Button,
  CircularProgress
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
import { fetchDashboardData, DashboardData } from '../services/dashboardService';
import InventorySection from '../components/InventorySection';
import PortfolioValue from '../components/PortfolioValue';
import ReportsSection from '../components/ReportsSection';

// Mock data for charts
const profitData = [
  { name: 'Jan', profit: 4000, expenses: 2400 },
  { name: 'Feb', profit: 3000, expenses: 1398 },
  { name: 'Mar', profit: 2000, expenses: 9800 },
  { name: 'Apr', profit: 2780, expenses: 3908 },
  { name: 'May', profit: 1890, expenses: 4800 },
  { name: 'Jun', profit: 2390, expenses: 3800 },
];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Error loading dashboard data.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Date Range Selector */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
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
              <Button>Last week</Button>
              <Button>Last month</Button>
              <Button>6 months</Button>
              <Button>1 year</Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Portfolio Value Display */}
      <PortfolioValue 
        currentValue={data.portfolioValue}
        valueChange={22324.19}
        percentageChange={29.07}
      />

      {/* Reports Section */}
      <Box sx={{ mb: 3 }}>
        <ReportsSection />
      </Box>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <Typography variant="h6" gutterBottom>Profit Breakdown</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
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
                  formatter={(value) => [`$${value}`, '']}
                  contentStyle={{ 
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                  fill="#82ca9d" 
                  radius={[4, 4, 0, 0]}
                  name="Expenses"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Inventory Section */}
        <Grid item xs={12}>
          <InventorySection />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
