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

interface MetricsCardProps {
  title: string;
  value: string | number;
  change: number;
  data: Array<{ date: string; value: number }>;
  prefix?: string;
  suffix?: string;
  tooltipText?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  data,
  prefix = '$',
  suffix = '',
  tooltipText
}) => {
  const theme = useTheme();
  
  return (
    <Paper sx={{ 
      p: 2, 
      height: '100%', 
      borderRadius: 2, 
      bgcolor: theme.palette.background.paper,
      color: theme.palette.text.primary
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: theme.palette.text.secondary,
            mb: 1,
            fontSize: '0.875rem'
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
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            fontSize: '1.25rem',
            color: theme.palette.text.primary
          }}
        >
          {prefix}{value}{suffix}
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

      <Box sx={{ height: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone"
              dataKey="value"
              stroke={change >= 0 ? theme.palette.success.main : theme.palette.error.main}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default MetricsCard;