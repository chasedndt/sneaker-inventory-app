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
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { fetchDashboardData, DashboardData } from '../services/dashboardService';
import InventorySection from '../components/InventorySection';

// Mock data for charts
const profitData = [
  { name: 'Jan', profit: 4000, expenses: 2400 },
  { name: 'Feb', profit: 3000, expenses: 1398 },
  { name: 'Mar', profit: 2000, expenses: 9800 },
  { name: 'Apr', profit: 2780, expenses: 3908 },
  { name: 'May', profit: 1890, expenses: 4800 },
  { name: 'Jun', profit: 2390, expenses: 3800 },
];

const portfolioTrendData = [
  { name: 'Jan', value: 90000 },
  { name: 'Feb', value: 85000 },
  { name: 'Mar', value: 95000 },
  { name: 'Apr', value: 99000 },
  { name: 'May', value: 97000 },
  { name: 'Jun', value: 99129 },
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
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          ${data.portfolioValue.toLocaleString()}
        </Typography>
        <Typography color="text.secondary">
          {data.totalInventory} items in inventory
        </Typography>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6">Total Inventory</Typography>
            <Typography variant="h4">{data.totalInventory}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6">Active Listings</Typography>
            <Typography variant="h4">{data.activeListings}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6">Sales This Month</Typography>
            <Typography variant="h4">${data.monthlySales}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6">Profit Margin</Typography>
            <Typography variant="h4">{data.profitMargin}%</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Portfolio Metrics */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Portfolio Metrics</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Net Profit
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">${data.metrics.netProfit}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                  <TrendingUpIcon fontSize="small" />
                  <Typography variant="caption">{data.metrics.netProfitChange}%</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Spend
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">${data.metrics.totalSpend}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                  <TrendingDownIcon fontSize="small" />
                  <Typography variant="caption">{data.metrics.totalSpendChange}%</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Items Purchased
              </Typography>
              <Typography variant="h6">{data.metrics.itemsPurchased}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Items Sold
              </Typography>
              <Typography variant="h6">{data.metrics.itemsSold}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

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

        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3,
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <Typography variant="h6" gutterBottom>Portfolio Value Trend</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={portfolioTrendData}>
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
                  formatter={(value) => [`$${value}`, 'Value']}
                  contentStyle={{ 
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
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
