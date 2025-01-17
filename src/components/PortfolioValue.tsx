// src/components/PortfolioValue.tsx
import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  ToggleButtonGroup, 
  ToggleButton,
  styled 
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

// Styled components
const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  padding: '4px 12px',
  fontSize: '0.875rem',
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));

// Mock data - will be replaced with real data later
const mockData = [
  { date: '1/1', value: 76805 },
  { date: '1/8', value: 82400 },
  { date: '1/15', value: 85900 },
  { date: '1/22', value: 89700 },
  { date: '1/29', value: 94500 },
  { date: '2/5', value: 99129 },
];

interface PortfolioValueProps {
  currentValue: number;
  valueChange: number;
  percentageChange: number;
}

const PortfolioValue: React.FC<PortfolioValueProps> = ({
  currentValue,
  valueChange,
  percentageChange,
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

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
            ${currentValue.toLocaleString()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: valueChange >= 0 ? 'success.main' : 'error.main' 
            }}>
              <TrendingUpIcon fontSize="small" />
              <Typography variant="body1" sx={{ ml: 0.5 }}>
                ${Math.abs(valueChange).toLocaleString()}
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              color={valueChange >= 0 ? 'success.main' : 'error.main'}
            >
              ({percentageChange}%)
            </Typography>
          </Box>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
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

      <Box sx={{ height: 300, mt: 3 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
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
      </Box>
    </Paper>
  );
};

export default PortfolioValue;
