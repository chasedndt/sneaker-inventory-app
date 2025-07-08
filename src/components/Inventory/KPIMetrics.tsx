// src/components/Inventory/KPIMetrics.tsx
import React from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Divider,
  Tooltip,
  useTheme
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import useFormat from '../../hooks/useFormat'; // Import as default export
import { useSettings } from '../../contexts/SettingsContext';
import { useAuthReady } from '../../hooks/useAuthReady';

interface KPIMetricsProps {
  metrics: {
    totalItems: number;
    unlistedItems: number;
    listedItems: number;
    soldItems: number;
    totalPurchaseValue: number;
    totalShippingValue: number;
    totalMarketValue: number;
    totalEstimatedProfit: number;
  };
}

const KPIMetrics: React.FC<KPIMetricsProps> = ({ metrics }) => {
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  const settings = useSettings(); // Get settings context
  const { authReady, currentUser } = useAuthReady();
  const accountTier = currentUser?.accountTier || 'Free';
  
  // Use the totalEstimatedProfit directly from the metrics object
  // This should already be converted to the correct currency by the parent component
  const calculatedProfit = metrics.totalEstimatedProfit;
  
  // Calculate average ROI based on the profit
  const averageROI = metrics.totalItems > 0
    ? (calculatedProfit / metrics.totalPurchaseValue) * 100
    : 0;
  
  // Check if ROI features are locked for free tier
  const isROILocked = accountTier?.toLowerCase() === 'free';
  
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
        {/* Total Items */}
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
              <InventoryIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Total Items
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {metrics.totalItems}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FiberManualRecordIcon 
                    sx={{ 
                      color: 'text.disabled',
                      fontSize: 12, 
                      mr: 0.5 
                    }} 
                  />
                  <Typography variant="caption">
                    {metrics.unlistedItems} Unlisted
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoneyIcon sx={{ color: 'warning.main', fontSize: 12, mr: 0.5 }} />
                  <Typography variant="caption">
                    {metrics.listedItems} Listed
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
        
        {/* Total Purchase Value */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'secondary.main',
                color: 'white',
                mr: 2
              }}
            >
              <ShoppingBagIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Total Purchase Value
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {money(metrics.totalPurchaseValue)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Avg: {money(metrics.totalPurchaseValue / Math.max(1, metrics.totalItems))} per item
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Total Shipping Value */}
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
              <LocalShippingIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Total Shipping Value
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {money(metrics.totalShippingValue)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Avg: {money(metrics.totalShippingValue / Math.max(1, metrics.totalItems))} per item
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Estimated Profit */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                backgroundColor: isROILocked ? 'grey.400' : 'success.main',
                color: 'white',
                mr: 2
              }}
            >
              {isROILocked ? <LockOutlinedIcon /> : <TrendingUpIcon />}
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Estimated Profit (ROI)
              </Typography>
              {isROILocked ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.disabled' }}>
                    ••••••
                  </Typography>
                  <Tooltip title="Upgrade to Starter or Professional plan to see ROI analysis">
                    <Typography 
                      variant="caption" 
                      color="text.disabled"
                      sx={{ fontWeight: 'bold', cursor: 'help' }}
                    >
                      Locked - Upgrade required
                    </Typography>
                  </Tooltip>
                </>
              ) : (
                <>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {money(calculatedProfit)}
              </Typography>
              <Typography 
                variant="caption" 
                color={averageROI >= 0 ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'bold' }}
              >
                {averageROI.toFixed(1)}% ROI
              </Typography>
                </>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default KPIMetrics;