// src/components/Inventory/StockInsights.tsx
import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  LineChart,
  TooltipProps
} from 'recharts';
import { InventoryItem } from '../../pages/InventoryPage';
import useFormat from '../../hooks/useFormat';

interface StockInsightsProps {
  items: InventoryItem[];
}

// Colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StockInsights: React.FC<StockInsightsProps> = ({ items }) => {
  const theme = useTheme();
  const { money } = useFormat();

  // Group items by status
  const statusData = useMemo(() => {
    const statusCounts = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Unlisted', value: statusCounts.unlisted || 0 },
      { name: 'Listed', value: statusCounts.listed || 0 }
    ];
  }, [items]);

  // Group items by brand
  const brandData = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    
    items.forEach(item => {
      brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
    });
    
    // Get top 5 brands by count
    return Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand, count]) => ({
        name: brand,
        value: count
      }));
  }, [items]);

  // Group items by category
  const categoryData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    
    items.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({
        name: category,
        value: count
      }));
  }, [items]);

  // Distribute items by purchase date (monthly)
  const timelineData = useMemo(() => {
    // Create a map of months to item counts
    const monthlyData: Record<string, { total: number, unlisted: number, listed: number }> = {};
    
    items.forEach(item => {
      const date = new Date(item.purchaseDate);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { total: 0, unlisted: 0, listed: 0 };
      }
      
      monthlyData[monthYear].total += 1;
      if (item.status === 'unlisted') {
        monthlyData[monthYear].unlisted += 1;
      } else if (item.status === 'listed') {
        monthlyData[monthYear].listed += 1;
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(monthlyData)
      .map(([date, counts]) => ({
        date,
        ...counts
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.date.split('/').map(Number);
        const [bMonth, bYear] = b.date.split('/').map(Number);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      });
  }, [items]);

  // Calculate value by category
  const categoryValueData = useMemo(() => {
    const valueByCategory: Record<string, number> = {};
    
    items.forEach(item => {
      if (!valueByCategory[item.category]) {
        valueByCategory[item.category] = 0;
      }
      valueByCategory[item.category] += item.marketPrice;
    });
    
    return Object.entries(valueByCategory)
      .map(([category, value]) => ({
        name: category,
        value: value
      }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  // Custom tooltips for better display
  const renderCustomBarTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: theme.palette.background.paper, p: 1.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          <Typography variant="subtitle2" color="primary">{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={`item-${index}`} variant="body2" color={entry.color}>
              {`${entry.name}: ${entry.value}`}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const renderCustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: theme.palette.background.paper, p: 1.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          <Typography variant="subtitle2" color="primary">{payload[0]?.name}</Typography>
          <Typography variant="body2" color={payload[0]?.color}>
            {`Count: ${payload[0]?.value}`}
          </Typography>
          <Typography variant="body2" color={payload[0]?.color}>
            {`Percentage: ${((payload[0]?.value || 0) / items.length * 100).toFixed(1)}%`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const renderValueTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: theme.palette.background.paper, p: 1.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          <Typography variant="subtitle2" color="primary">{payload[0]?.name}</Typography>
          <Typography variant="body2" color={payload[0]?.color}>
            {`Value: ${money(payload[0]?.value || 0)}`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Stock Insights
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {/* Timeline Chart - Items over time */}
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Inventory Growth Over Time</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={renderCustomBarTooltip} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total Items" />
                <Line type="monotone" dataKey="unlisted" stroke="#82ca9d" name="Unlisted" />
                <Line type="monotone" dataKey="listed" stroke="#ffc658" name="Listed" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Status Breakdown - Pie chart */}
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Status Breakdown</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={renderCustomPieTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Brand Breakdown - Bar chart */}
        <Grid item xs={12} sm={6} md={6}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Top Brands</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={brandData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={renderCustomBarTooltip} />
                <Legend />
                <Bar dataKey="value" name="Item Count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Category Value - Bar chart */}
        <Grid item xs={12} sm={6} md={6}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Value by Category</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryValueData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={renderValueTooltip} />
                <Legend />
                <Bar dataKey="value" name="Total Value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StockInsights;