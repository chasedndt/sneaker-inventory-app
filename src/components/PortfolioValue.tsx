import React from 'react';
import { 
  Box, 
  Typography, 
  Tooltip,
  Theme,
  useTheme
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';

interface PortfolioValueProps {
  currentValue: number;
  valueChange: number;
  percentageChange: number;
  data: Array<{ date: string; value: number }>;
  theme?: Theme;
}

const PortfolioValue: React.FC<PortfolioValueProps> = ({
  currentValue,
  valueChange,
  percentageChange,
  data,
  theme: propTheme
}) => {
  // Use provided theme or default theme
  const defaultTheme = useTheme();
  const theme = propTheme || defaultTheme;

  // Fixed styling for dark mode
  const isDarkMode = theme.palette.mode === 'dark';

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

  // Calculate min and max values for Y-axis
  const minValue = Math.min(...data.map(item => item.value)) * 0.95; // 5% below min
  const maxValue = Math.max(...data.map(item => item.value)) * 1.05; // 5% above max

  return (
    <Box sx={{ 
      p: 0, 
      bgcolor: isDarkMode ? '#1e1e2d' : '#fff',
      color: isDarkMode ? '#fff' : 'inherit',
      height: '100%', // Use full height of the container
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        p: 2
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: valueChange >= 0 ? '#4CAF50' : '#f44336'
            }}>
              {valueChange >= 0 ? (
                <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
              ) : (
                <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
              )}
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
            <Tooltip title="Total portfolio value based on market prices of all items in inventory">
              <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, width: '100%', pt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
              domain={[minValue, maxValue]} // Dynamic Y-axis range
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line 
              type="monotone"
              dataKey="value" 
              stroke="#8884d8" 
              strokeWidth={2.5}
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#8884d8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PortfolioValue;