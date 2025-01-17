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

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  padding: '4px 12px',
  fontSize: '0.813rem',
  fontWeight: 500,
  color: '#666',
  borderColor: '#e0e0e0',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  '&.Mui-selected': {
    backgroundColor: '#f5f5f5',
    color: '#1a1a1a',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: '#eeeeee',
    },
  },
  height: '32px',
  minWidth: '48px',
}));

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
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#fff' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 3
      }}>
        <Box>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 600,
              fontSize: '2rem',
              mb: 0.5,
              color: '#1a1a1a'
            }}
          >
            ${currentValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: valueChange >= 0 ? '#4CAF50' : '#f44336',
              fontSize: '0.875rem'
            }}>
              <TrendingUpIcon 
                fontSize="small" 
                sx={{ 
                  mr: 0.5,
                  transform: valueChange < 0 ? 'rotate(180deg)' : 'none'
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  fontSize: '0.875rem'
                }}
              >
                ${Math.abs(valueChange).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: valueChange >= 0 ? '#4CAF50' : '#f44336',
                fontWeight: 500,
                fontSize: '0.875rem'
              }}
            >
              ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
            </Typography>
          </Box>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
          sx={{
            backgroundColor: '#fff',
            '& .MuiToggleButtonGroup-grouped': {
              margin: 0,
              border: 1,
              '&:not(:first-of-type)': {
                borderRadius: 0,
                borderLeft: '1px solid',
                borderColor: '#e0e0e0',
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

      <Box sx={{ height: 300, mt: 3 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={mockData}
            margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f5f5f5"
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              dy={10}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ fill: '#666', fontSize: 12 }}
              dx={-10}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
              contentStyle={{ 
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '8px 12px',
                backgroundColor: '#fff'
              }}
              labelStyle={{ color: '#666' }}
              cursor={{ stroke: '#8884d8', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Line 
              type="monotoneX"
              dataKey="value" 
              stroke="#8884d8" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: '#8884d8',
                strokeWidth: 0
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PortfolioValue;
