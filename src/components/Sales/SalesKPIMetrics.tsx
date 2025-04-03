// src/components/Sales/SalesKPIMetrics.tsx
import React from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  useTheme
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import useFormat from '../../hooks/useFormat'; // Import the formatting hook

interface SalesKPIMetricsProps {
  metrics: {
    totalSalesRevenue: number;
    avgProfitPerSale: number;
    pendingShipments: number;
    completedSales: number;
    totalSales: number;
  };
}

const SalesKPIMetrics: React.FC<SalesKPIMetricsProps> = ({ metrics }) => {
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  
  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2d' : '#fff',
        borderRadius: 2
      }}
    >
      <Grid container spacing={3}>
        {/* Total Sales Revenue */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'primary.main',
                color: 'white',
                mr: 2
              }}
            >
              <PaymentIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Total Sales Revenue
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {money(metrics.totalSalesRevenue)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                From {metrics.totalSales} sales
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Average Profit per Sale */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'success.main',
                color: 'white',
                mr: 2
              }}
            >
              <ShowChartIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Avg. Profit per Sale
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {money(metrics.avgProfitPerSale)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                After fees and taxes
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Pending Shipments */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'warning.main',
                color: 'white',
                mr: 2
              }}
            >
              <LocalShippingIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Pending Shipments
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {metrics.pendingShipments}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Need to be shipped
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Completed Sales */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'info.main',
                color: 'white',
                mr: 2
              }}
            >
              <AssignmentTurnedInIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Completed Sales
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {metrics.completedSales}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {metrics.totalSales > 0 
                  ? `${((metrics.completedSales / metrics.totalSales) * 100).toFixed(1)}% completion rate` 
                  : 'No sales yet'}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SalesKPIMetrics;