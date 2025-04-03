// src/components/MetricsCard.tsx
import React from 'react';
import { 
  Paper, 
  Typography, 
  Box,
  useTheme,
  Tooltip
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';
import useFormat from '../hooks/useFormat'; // Import formatting hook

interface MetricsCardProps {
  title: string;
  value: string | number;
  change: number;
  data: Array<{ date: string; value: number }>;
  prefix?: string;
  suffix?: string;
  tooltipText?: string;
  useFormatter?: boolean; // Optional prop to specify whether to use the formatter
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  data,
  prefix = '',  // Changed from '$' to empty string, will use the formatter
  suffix = '',
  tooltipText,
  useFormatter = true // Default to true for monetary values
}) => {
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  
  // Format the value using the money formatter if it's a number and useFormatter is true
  const displayValue = useFormatter && typeof value === 'number' 
    ? money(value) 
    : value;
  
  return (
    <Paper sx={{ 
      p: 2.5, 
      height: '100%', 
      borderRadius: 2, 
      bgcolor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      '&:hover': {
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        transform: 'translateY(-2px)',
        transition: 'all 0.2s ease-in-out'
      },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: theme.palette.text.secondary,
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {title}
        </Typography>
        
        {tooltipText && (
          <Tooltip title={tooltipText} placement="top" arrow>
            <InfoIcon fontSize="small" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', cursor: 'help' }} />
          </Tooltip>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            fontSize: '1.35rem',
            color: theme.palette.text.primary
          }}
        >
          {/* Remove the prefix and use the formatted money value directly */}
          {useFormatter && typeof value === 'number' ? displayValue : prefix + displayValue + suffix}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: change >= 0 ? theme.palette.success.main : theme.palette.error.main,
          fontSize: '0.875rem'
        }}>
          {change >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {change >= 0 ? '+' : ''}{change}%
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, mt: 'auto', display: 'flex', alignItems: 'flex-end', minHeight: 80 }}>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={data}>
            <Line 
              type="monotone"
              dataKey="value"
              stroke={change >= 0 ? theme.palette.success.main : theme.palette.error.main}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default MetricsCard;