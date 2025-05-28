// src/components/MetricsCard.tsx
import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Tooltip, 
  IconButton, 
  useTheme 
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import useFormat from '../hooks/useFormat'; 

interface MetricsCardProps {
  title: React.ReactNode;
  value: string | number;
  change?: number; 
  data?: Array<{ name: string; value: number }>; 
  tooltipText?: string;
  useFormatter?: boolean; 
  suffix?: string; 
}

const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  value: rawValue, 
  change, 
  data,
  tooltipText,
  useFormatter = true, 
  suffix = '' 
}) => {
  const theme = useTheme();
  const { money } = useFormat(); 

  const formattedValue = useFormatter && typeof rawValue === 'number' 
    ? money(Number(rawValue), 'GBP') 
    : `${rawValue}${suffix}`;

  const actualChangeDefined = typeof change === 'number';
  const changeColor = actualChangeDefined && change < 0 ? theme.palette.error.main : theme.palette.success.main;
  const changeSymbol = actualChangeDefined ? (change >= 0 ? '▲' : '▼') : '';
  const formattedChange = actualChangeDefined ? `${Math.abs(change).toFixed(1)}%` : '';

  let displayChartData = data;
  let lineStrokeColor = changeColor; 

  if (!data || data.length < 2) {
    displayChartData = [
      { name: 'T1', value: 10 }, 
      { name: 'T2', value: 10 }, 
      { name: 'T3', value: 10 },
    ];
    lineStrokeColor = actualChangeDefined && change < 0 
        ? theme.palette.error.light 
        : theme.palette.success.light;
  } else {
    lineStrokeColor = actualChangeDefined && change < 0 
        ? theme.palette.error.main 
        : theme.palette.success.main;
  }

  return (
    <Card sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      p: 1, 
      boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
      borderRadius: '12px',
      backgroundColor: theme.palette.background.paper,
    }}> 
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: '6px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.4 }}>
            {title}
          </Typography>
          {tooltipText && (
            <Tooltip title={tooltipText} placement="top" arrow>
              <IconButton size="small" sx={{ p: 0, color: 'text.disabled' }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            {formattedValue}
          </Typography>
          {actualChangeDefined && (
            <Typography variant="caption" sx={{ color: changeColor, display: 'flex', alignItems: 'center', fontWeight: 500 }}>
              {changeSymbol} {formattedChange}
            </Typography>
          )}
        </Box>
        <Box sx={{ height: 60, width: '100%', mt: 'auto', mb: 0, minHeight: 60 }}> 
          {displayChartData && displayChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}> 
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['dataMin - Math.abs(dataMin*0.1)', 'dataMax + Math.abs(dataMax*0.1)']} /> 
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper, 
                    border: `1px solid ${theme.palette.divider}`, 
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: theme.shadows[3],
                  }}
                  itemStyle={{ color: theme.palette.text.primary, fontSize: '0.875rem' }}
                  labelStyle={{ display: 'none' }} 
                  formatter={(val: number) => [useFormatter ? money(val, 'GBP') : val, null]} 
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={lineStrokeColor} 
                  strokeWidth={2.5} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
              {/* Optional: Text if no chart can be rendered at all */}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;