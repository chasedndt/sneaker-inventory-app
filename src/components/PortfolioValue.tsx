// src/components/PortfolioValue.tsx
import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  ToggleButtonGroup, 
  ToggleButton,
  styled,
  Theme
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Custom styled ToggleButton to handle dark mode properly
const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  padding: '4px 12px',
  fontSize: '0.813rem',
  fontWeight: 500,
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#666',
  borderColor: theme.palette.divider,
  textTransform: 'none',
  height: '32px',
  minWidth: '48px',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.08)' 
      : 'rgba(0, 0, 0, 0.04)',
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.16)' 
      : '#f5f5f5',
    color: theme.palette.mode === 'dark' 
      ? '#fff' 
      : '#1a1a1a',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.24)' 
        : '#eeeeee',
    },
  },
}));

// Mock data matching the chart
const mockData = [
  { date: '1/1', value: 76805 },
  { date: '1/8', value: 82400 },
  { date: '1/15', value: 85900 },
  { date: '1/22', value: 89700 },
  { date: '1/29', value: 94500 },
  { date: '2/5', value: 99129 }
];

interface PortfolioValueProps {
  currentValue: number;
  valueChange: number;
  percentageChange: number;
  theme?: Theme; // Accept theme prop for proper dark mode styling
}

const PortfolioValue: React.FC<PortfolioValueProps> = ({
  currentValue,
  valueChange,
  percentageChange,
  theme
}) => {
  const [timeRange, setTimeRange] = useState('1M');

  const handleTimeRangeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeRange: string,
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  // Fixed styling for dark mode
  const isDarkMode = theme?.palette.mode === 'dark';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{
          bgcolor: isDarkMode ? '#1e1e2d' : '#fff',
          p: 1.5,
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`
        }}>
          <Typography variant="body2" sx={{ 
            color: isDarkMode ? '#fff' : '#1a1a1a', 
            fontWeight: 500 
          }}>
            ${payload[0].value.toLocaleString()}
          </Typography>
          <Typography variant="caption" sx={{ 
            color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666' 
          }}>
            {payload[0].payload.date}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ 
      p: 3, 
      borderRadius: 2, 
      bgcolor: isDarkMode ? '#1e1e2d' : '#fff',
      color: isDarkMode ? '#fff' : 'inherit'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 3
      }}>
        <Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 600,
            fontSize: '2rem',
            mb: 0.5,
            color: isDarkMode ? '#fff' : '#1a1a1a'
          }}>
            ${currentValue.toLocaleString()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: valueChange >= 0 ? '#4CAF50' : '#f44336'
            }}>
              <TrendingUpIcon fontSize="small" sx={{ 
                mr: 0.5,
                transform: valueChange < 0 ? 'rotate(180deg)' : 'none'
              }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                ${Math.abs(valueChange).toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ 
              color: valueChange >= 0 ? '#4CAF50' : '#f44336',
              fontWeight: 500
            }}>
              ({percentageChange >= 0 ? '+' : ''}{percentageChange}%)
            </Typography>
          </Box>
        </Box>

        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
          sx={{
            '& .MuiToggleButtonGroup-grouped': {
              margin: 0,
              border: 1,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
              '&:not(:first-of-type)': {
                borderRadius: 0,
                borderLeft: '1px solid',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
              },
              '&:first-of-type': {
                borderRadius: '4px 0 0 4px',
              },
              '&:last-of-type': {
                borderRadius: '0 4px 4px 0',
              },
            },
          }}
        >
          <StyledToggleButton value="24H">24H</StyledToggleButton>
          <StyledToggleButton value="1W">1W</StyledToggleButton>
          <StyledToggleButton value="1M">1M</StyledToggleButton>
          <StyledToggleButton value="3M">3M</StyledToggleButton>
          <StyledToggleButton value="6M">6M</StyledToggleButton>
          <StyledToggleButton value="1Y">1Y</StyledToggleButton>
          <StyledToggleButton value="ALL">ALL</StyledToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5'} 
              vertical={false} 
            />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              dy={10}
              tick={{ 
                fill: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666', 
                fontSize: 12 
              }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ 
                fill: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666', 
                fontSize: 12 
              }}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone"
              dataKey="value" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#8884d8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PortfolioValue;