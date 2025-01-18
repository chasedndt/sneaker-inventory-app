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

const profitData = [
  { name: 'Jan', profit: 3400, expenses: 2450 },
  { name: 'Feb', profit: 2800, expenses: 1600 },
  { name: 'Mar', profit: 1900, expenses: 4500 },
  { name: 'Apr', profit: 2780, expenses: 3200 },
  { name: 'May', profit: 1890, expenses: 3100 },
  { name: 'Jun', profit: 2390, expenses: 3000 },
  { name: 'Jul', profit: 3090, expenses: 3200 },
  { name: 'Aug', profit: 2800, expenses: 3100 },
  { name: 'Sep', profit: 3200, expenses: 3300 },
  { name: 'Oct', profit: 3800, expenses: 3000 },
  { name: 'Nov', profit: 3200, expenses: 3100 },
  { name: 'Dec', profit: 3900, expenses: 3000 }
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
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

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
        currentValue={50000.00}
        valueChange={22324.19}
        percentageChange={29.07}
      />

      {/* Profit Breakdown */}
      <Paper sx={{ 
        p: '24px',
        borderRadius: 2,
        bgcolor: '#fff'
      }}>
        <Typography variant="h6" gutterBottom>Profit Breakdown</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={profitData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
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
                  const netProfit = profit - expenses;
                  return (
                    <Box sx={{ 
                      bgcolor: '#fff', 
                      p: 1.5,
                      borderRadius: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <Typography variant="body2">Profit: ${profit}</Typography>
                      <Typography variant="body2">Expenses: ${expenses}</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: netProfit >= 0 ? '#4CAF50' : '#f44336',
                          fontWeight: 600
                        }}
                      >
                        Net: ${netProfit >= 0 ? '+' : ''}{netProfit}
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
              fill="#82ca9d" 
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
    </Box>
  );
};

export default Dashboard;
