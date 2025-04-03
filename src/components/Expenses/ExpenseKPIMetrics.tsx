// src/components/Expenses/ExpenseKPIMetrics.tsx
import React from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Divider,
  Tooltip,
  useTheme
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';
import useFormat from '../../hooks/useFormat'; // Import formatting hook

import { ExpenseSummary } from '../../models/expenses';

interface ExpenseKPIMetricsProps {
  summary: ExpenseSummary;
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
}

interface ExpenseTypeData {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  '#4caf50', // green
  '#2196f3', // blue
  '#ff9800', // orange
  '#9c27b0', // purple
  '#3f51b5', // indigo
  '#00bcd4', // cyan
  '#e91e63', // pink
  '#795548', // brown
  '#607d8b', // grey
  '#f44336', // red
  '#8bc34a', // light green
  '#ff5722', // deep orange
  '#9e9e9e'  // grey
];

const ExpenseKPIMetrics: React.FC<ExpenseKPIMetricsProps> = ({
  summary,
  dateRange
}) => {
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  
  // Format data for the pie chart
  const getPieChartData = (): ExpenseTypeData[] => {
    return Object.entries(summary.expenseByType).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  };
  
  const pieChartData = getPieChartData();
  
  // Calculate percentages for each expense type
  const totalExpense = summary.totalAmount;
  const expensePercentages = Object.entries(summary.expenseByType).map(([name, value]) => ({
    name,
    percentage: ((value / totalExpense) * 100).toFixed(1)
  }));
  
  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box sx={{
          bgcolor: theme.palette.background.paper,
          p: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          boxShadow: theme.shadows[2]
        }}>
          <Typography variant="subtitle2" color="text.primary">
            {data.name}
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
            {money(data.value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {((data.value / totalExpense) * 100).toFixed(1)}% of total
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
      bgcolor: theme.palette.background.paper,
      boxShadow: theme.shadows[2]
    }}>
      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                mr: 2
              }}
            >
              <PaymentsIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Expenses
                <Tooltip title="Total amount spent on all expenses">
                  <InfoIcon fontSize="small" sx={{ ml: 0.5, mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {money(summary.totalAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.expenseCount} expense entries
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'secondary.main',
                color: 'white',
                mr: 2
              }}
            >
              <ReceiptLongIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Average per Expense
                <Tooltip title="Average amount per expense entry">
                  <InfoIcon fontSize="small" sx={{ ml: 0.5, mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {summary.expenseCount > 0 
                  ? money(summary.totalAmount / summary.expenseCount) 
                  : money(0)
                }
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dateRange?.startDate && dateRange?.endDate 
                  ? 'In selected date range' 
                  : 'All time average'
                }
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: summary.monthOverMonthChange >= 0 ? '#4caf50' : '#f44336',
                color: 'white',
                mr: 2
              }}
            >
              {summary.monthOverMonthChange >= 0 
                ? <TrendingUpIcon /> 
                : <TrendingDownIcon />
              }
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Month-over-Month Change
                <Tooltip title="Change in expenses compared to previous month">
                  <InfoIcon fontSize="small" sx={{ ml: 0.5, mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold',
                  color: summary.monthOverMonthChange >= 0 ? '#4caf50' : '#f44336'
                }}
              >
                {summary.monthOverMonthChange >= 0 ? '+' : ''}
                {summary.monthOverMonthChange.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.monthOverMonthChange >= 0 ? 'Increase' : 'Decrease'} from previous period
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Expense Breakdown */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Expense Breakdown
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Expense Distribution
          </Typography>
          <Box sx={{ 
            maxHeight: 300, 
            overflow: 'auto',
            pr: 1,
            '&::-webkit-scrollbar': {
              width: '0.4em'
            },
            '&::-webkit-scrollbar-track': {
              boxShadow: 'inset 0 0 6px rgba(0,0,0,0.1)',
              webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.1)'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,.2)',
              borderRadius: '10px'
            }
          }}>
            {expensePercentages.map((expense, index) => (
              <Box key={expense.name} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {expense.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {money(summary.expenseByType[expense.name])} ({expense.percentage}%)
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: `${expense.percentage}%`, 
                      height: '100%',
                      borderRadius: 4,
                      bgcolor: COLORS[index % COLORS.length]
                    }} 
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ExpenseKPIMetrics;