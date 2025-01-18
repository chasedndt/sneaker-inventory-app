import React from 'react';
import { 
  Paper, 
  Typography, 
  Box 
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change: number;
  data: Array<{ date: string; value: number }>;
  prefix?: string;
  suffix?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  data,
  prefix = '$',
  suffix = ''
}) => {
  return (
    <Paper sx={{ p: 2, height: '100%', borderRadius: 2 }}>
      <Typography 
        variant="subtitle2" 
        sx={{ 
          color: 'text.secondary',
          mb: 1,
          fontSize: '0.875rem'
        }}
      >
        {title}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            fontSize: '1.25rem'
          }}
        >
          {prefix}{value}{suffix}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: change >= 0 ? 'success.main' : 'error.main',
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
              stroke={change >= 0 ? '#4CAF50' : '#f44336'}
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
