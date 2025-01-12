import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import { 
  Container, 
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
import { fetchDashboardData, DashboardData } from '../services/dashboardService';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    fetchDashboardData()
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!data) {
    return (
      <Container sx={{ p: 3 }}>
        <Typography>Error loading dashboard data.</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Date Range Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
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
            <ButtonGroup variant="outlined" fullWidth>
              <Button>Last week</Button>
              <Button>Last month</Button>
              <Button>6 months</Button>
              <Button>1 year</Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Portfolio Value */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          ${data.totalInventory.toLocaleString()}
        </Typography>
        <Typography color="text.secondary">
          {data.activeListings} items in inventory
        </Typography>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Inventory</Typography>
            <Typography variant="h4">{data.totalInventory}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Active Listings</Typography>
            <Typography variant="h4">{data.activeListings}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Sales This Month</Typography>
            <Typography variant="h4">${data.salesThisMonth}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Profit Margin</Typography>
            <Typography variant="h4">{data.profitMargin}%</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
