// src/components/PortfolioValue.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Theme,
  useTheme,
  Divider,
  Skeleton
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import useFormat from '../hooks/useFormat';
import { useAuth } from '../contexts/AuthContext';
import { User } from 'firebase/auth';

// Control debug logging globally
const enableDebugLogging = false;

interface PortfolioValueProps {
  currentValue: number;
  valueChange: number;
  percentageChange: number;
  data: Array<{ date: string; value: number }>;
  theme: Theme;
  loading?: boolean;
  currentUser?: User | null;
}

// Define an interface for the custom payload value format
interface CustomPayloadValue {
  value?: number;
  currency?: string;
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { money } = useFormat();
  const theme = useTheme();
  
  if (active && payload && payload.length) {
    // Get the value from the payload
    const payloadValue = payload[0].value || 0;
    
    // Cast to the custom type if it's an object
    const value = typeof payloadValue === 'object' ? payloadValue as unknown as CustomPayloadValue : payloadValue;
    
    // Check if the value already has currency info
    // This prevents repeated conversions of the same value
    // Ensure we always have a number to pass to money function
    const valueToFormat = typeof value === 'object' && 'value' in value 
      ? (value.value ?? 0) // Use nullish coalescing to provide a default of 0
      : (value ?? 0);     // Also handle the case where value itself might be undefined
    
    // If the value has currency info, use it, otherwise don't specify
    const currency = typeof value === 'object' && 'currency' in value ? 
      value.currency : undefined;
      
    return (
      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2">{label}</Typography>
        <Typography
          variant="body1"
          sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}
        >
          {money(valueToFormat as number, currency)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

const PortfolioValue: React.FC<PortfolioValueProps> = (props) => {
  const theme = useTheme();
  const { money } = useFormat();
  const { currentUser: ctxUser } = useAuth();
  const { settings } = require('../contexts/SettingsContext').useSettings();

  const user: User | null | undefined = props.currentUser ?? ctxUser;

  // Debug log for all props - only shown when debug logging is enabled
  if (enableDebugLogging) {
    console.log('[PortfolioValue][DEBUG] Rendered with:', {
      currentUser: user,
      currentValue: props.currentValue,
      valueChange: props.valueChange,
      percentageChange: props.percentageChange,
      data: props.data,
      loading: props.loading
    });
  }

  // Early-return only when absolutely no user is present
  if (!user) {
    return null;
  }

  // If loading, show skeleton
  if (props.loading) {
    return (
      <Box sx={{ p: 3, width: '100%', height: '100%' }}>
        <Skeleton variant="text" width="50%" height={40} />
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rectangular" width="100%" height="80%" sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Portfolio Value Title */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Portfolio Value
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {money(props.currentValue)}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: props.percentageChange >= 0 ? 'success.light' : 'error.light',
              color: props.percentageChange >= 0 ? 'success.dark' : 'error.dark',
              p: 0.3,
              px: 0.8,
              borderRadius: 1,
            }}
          >
            {props.percentageChange >= 0 ? (
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            ) : (
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            )}
            <Typography variant="body2">
              {props.percentageChange >= 0 ? '+' : ''}
              {props.percentageChange}% ({money(props.valueChange)})
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 1 }} />
      
      {/* Chart */}
      <Box sx={{ flex: 1, width: '100%', minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={props.data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              tickFormatter={(value) => {
                const currencySymbol = settings?.currencySymbol || '$';
                // Format based on value magnitude
                if (value >= 1000000) {
                  return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${currencySymbol}${(value / 1000).toFixed(0)}k`;
                } else {
                  return `${currencySymbol}${value.toFixed(0)}`;
                }
              }}
              domain={['dataMin - dataMin * 0.05', 'dataMax + dataMax * 0.05']} // Add 5% padding
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={theme.palette.primary.main}
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PortfolioValue;