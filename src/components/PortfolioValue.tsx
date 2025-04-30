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
import { User } from 'firebase/auth';

interface PortfolioValueProps {
  currentValue: number;
  valueChange: number;
  percentageChange: number;
  data: Array<{ date: string; value: number }>;
  theme: Theme;
  loading?: boolean;
  currentUser?: User | null;
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { money } = useFormat();
  const theme = useTheme();
  
  if (active && payload && payload.length) {
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
          {money(payload[0].value || 0)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

const PortfolioValue: React.FC<PortfolioValueProps> = ({
  currentValue,
  valueChange,
  percentageChange,
  data,
  theme,
  loading = false,
  currentUser = null
}) => {
  // Debug log for all props
  console.log('[PortfolioValue][DEBUG] Rendered with:', {
    currentUser,
    currentValue,
    valueChange,
    percentageChange,
    data
  });
  const { money } = useFormat();
  
  // If loading, show skeleton
  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%', height: '100%' }}>
        <Skeleton variant="text" width="50%" height={40} />
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rectangular" width="100%" height="80%" sx={{ mt: 2 }} />
      </Box>
    );
  }
  
  // If no user is authenticated, show a message
  if (!currentUser) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Please log in to view your portfolio value
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Portfolio Value Title */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Total Portfolio Value
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {money(currentValue)}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: percentageChange >= 0 ? 'success.light' : 'error.light',
              color: percentageChange >= 0 ? 'success.dark' : 'error.dark',
              p: 0.5,
              px: 1,
              borderRadius: 1,
            }}
          >
            {percentageChange >= 0 ? (
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            ) : (
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            )}
            <Typography variant="body2">
              {percentageChange >= 0 ? '+' : ''}
              {percentageChange}% ({money(valueChange)})
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Chart */}
      <Box sx={{ flex: 1, width: '100%', minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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