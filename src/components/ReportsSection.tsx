// src/components/ReportsSection.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Tab,
  Tabs,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis
} from 'recharts';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Item } from '../services/api';
import { Sale } from '../services/salesApi';
import { Expense } from '../models/expenses';
import useFormat from '../hooks/useFormat';
import { dashboardService, ComprehensiveMetrics } from '../services/dashboardService';
import { User } from 'firebase/auth';

// Define the props for the ReportsSection component
interface ReportsSectionProps {
  items: Item[];
  sales: Sale[];
  expenses: Expense[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  currentUser: User | null;
}

// Interface for metrics data
interface MetricsData {
  inventoryMetrics: {
    totalInventory: number;
    unlistedItems: number;
    listedItems: number;
    totalInventoryCost: number;
    totalShippingCost: number;
    totalMarketValue: number;
    potentialProfit: number;
  };
  salesMetrics: {
    totalSales: number;
    totalSalesRevenue: number;
    totalPlatformFees: number;
    totalSalesTax: number;
    costOfGoodsSold: number;
    grossProfit: number;
    revenueChange: number;
  };
  expenseMetrics: {
    totalExpenses: number;
    expenseByType: Record<string, number>;
    expenseChange: number;
  };
  profitMetrics: {
    netProfitSold: number;
    netProfitChange: number;
    potentialProfit: number;
    roiSold: number;
    roiInventory: number;
    overallRoi: number;
    roiChange: number;
  };
}

// Define tab interface for type safety
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// TabPanel component for tab contents
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`metrics-tabpanel-${index}`}
      aria-labelledby={`metrics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Helper function to format tab aria-controls
function a11yProps(index: number) {
  return {
    id: `metrics-tab-${index}`,
    'aria-controls': `metrics-tabpanel-${index}`,
  };
}

// Main component definition
const ReportsSection: React.FC<ReportsSectionProps> = ({
  items,
  sales,
  expenses,
  startDate,
  endDate,
  currentUser
}) => {
  const theme = useTheme();
  const { money, percentFormat } = useFormat();
  
  // State for metrics data
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Color schemes for charts
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE',
    '#00C49F', '#FFBB28', '#FF8042', '#9c27b0', '#3f51b5'
  ];
  
  // Function to fetch comprehensive KPI metrics with authentication
  const fetchMetricsData = async () => {
    // Don't fetch if not authenticated
    if (!currentUser) {
      setError('Authentication required to fetch metrics data');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert dates to JS Date objects for the API
      const apiStartDate = startDate ? startDate.toDate() : undefined;
      const apiEndDate = endDate ? endDate.toDate() : undefined;
      
      // Fetch metrics data from the dashboard service
      const data = await dashboardService.fetchDashboardMetrics(apiStartDate, apiEndDate);
      setMetricsData(data as unknown as MetricsData);
      console.log('📊 Fetched comprehensive dashboard metrics:', data);
    } catch (err: any) {
      console.error('💥 Error fetching dashboard KPI metrics:', err);
      setError(`Failed to load metrics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch metrics when dates or user changes
  useEffect(() => {
    if (currentUser) {
      fetchMetricsData();
    }
  }, [startDate, endDate, currentUser]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Calculate revenue by month from sales data
  const getRevenueByMonthData = () => {
    // Group sales by month
    const salesByMonth: Record<string, number> = {};
    
    sales.forEach(sale => {
      const month = dayjs(sale.saleDate).format('MMM YYYY');
      if (!salesByMonth[month]) {
        salesByMonth[month] = 0;
      }
      salesByMonth[month] += sale.salePrice;
    });
    
    // Convert to array for chart
    return Object.entries(salesByMonth).map(([month, amount]) => ({
      month,
      amount
    }));
  };
  
  // Calculate expense distribution for pie chart
  const getExpenseDistributionData = () => {
    // Use metrics data if available, otherwise calculate from expenses
    if (metricsData?.expenseMetrics?.expenseByType) {
      return Object.entries(metricsData.expenseMetrics.expenseByType)
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length]
        }));
    }
    
    // Fallback calculation from expenses
    const expensesByType: Record<string, number> = {};
    
    expenses.forEach(expense => {
      if (!expensesByType[expense.expenseType]) {
        expensesByType[expense.expenseType] = 0;
      }
      expensesByType[expense.expenseType] += expense.amount;
    });
    
    return Object.entries(expensesByType).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  };
  
  // Calculate sales by category
  const getSalesByCategoryData = () => {
    const salesByCategory: Record<string, number> = {};
    
    sales.forEach(sale => {
      // Find the corresponding item for the sale
      const item = items.find(item => item.id === sale.itemId);
      if (item) {
        const category = item.category || 'Unknown';
        if (!salesByCategory[category]) {
          salesByCategory[category] = 0;
        }
        salesByCategory[category] += sale.salePrice;
      }
    });
    
    return Object.entries(salesByCategory).map(([category, amount], index) => ({
      category,
      amount,
      color: COLORS[index % COLORS.length]
    }));
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: theme.palette.background.paper,
          padding: '10px',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>{`${label || payload[0].name}`}</p>
          <p style={{ 
            margin: 0, 
            color: payload[0].color || theme.palette.primary.main,
            fontWeight: 'bold'
          }}>
            {`${money(payload[0].value || 0)}`}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Custom tooltip for pie charts
  const PieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{ 
          backgroundColor: theme.palette.background.paper,
          padding: '10px',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>{data.name}</p>
          <p style={{ 
            margin: 0, 
            color: data.color || theme.palette.primary.main,
            fontWeight: 'bold'
          }}>
            {`${money(data.value || 0)}`}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // If we're not authenticated, show a message
  if (!currentUser) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning">
          Please log in to view your metrics and reports.
        </Alert>
      </Box>
    );
  }
  
  // If loading, show a loading indicator
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%',
        p: 3
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If there's an error, show an error message
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }
  
  // If there's no data, show an empty state
  if (!items.length && !sales.length && !expenses.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No data available for reports
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add some items, record sales, or log expenses to see reports here.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => fetchMetricsData()}
          sx={{ mt: 2 }}
        >
          Refresh Data
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Tabs for different report types */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="dashboard metrics tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Sales" {...a11yProps(1)} />
          <Tab label="Expenses" {...a11yProps(2)} />
          <Tab label="Profit & ROI" {...a11yProps(3)} />
        </Tabs>
      </Box>
      
      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={2} sx={{ mt: 1, height: 'calc(100% - 40px)' }}>
          {/* Portfolio Overview */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Portfolio Overview
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Total Inventory</Typography>
                  <Typography variant="h6">
                    {metricsData?.inventoryMetrics?.totalInventory || items.filter(item => item.status !== 'sold').length}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Active Listings</Typography>
                  <Typography variant="h6">
                    {metricsData?.inventoryMetrics?.listedItems || items.filter(item => item.status === 'listed').length}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Total Inventory Value</Typography>
                  <Typography variant="h6">
                    {money(metricsData?.inventoryMetrics?.totalInventoryCost || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Market Value</Typography>
                  <Typography variant="h6">
                    {money(metricsData?.inventoryMetrics?.totalMarketValue || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Potential Profit</Typography>
                  <Typography variant="h6" color="success.main">
                    {money(metricsData?.inventoryMetrics?.potentialProfit || 0)}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => fetchMetricsData()}
                >
                  Refresh Metrics
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Sales & Expenses Summary */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Sales & Expenses
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Total Sales</Typography>
                  <Typography variant="h6">
                    {metricsData?.salesMetrics?.totalSales || sales.length}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Sales Revenue</Typography>
                  <Typography variant="h6" color="primary.main">
                    {money(metricsData?.salesMetrics?.totalSalesRevenue || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Total Expenses</Typography>
                  <Typography variant="h6" color="error.main">
                    {money(metricsData?.expenseMetrics?.totalExpenses || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Gross Profit</Typography>
                  <Typography variant="h6" color="success.main">
                    {money(metricsData?.salesMetrics?.grossProfit || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Net Profit</Typography>
                  <Typography variant="h6" color={
                    (metricsData?.profitMetrics?.netProfitSold || 0) >= 0 ? 'success.main' : 'error.main'
                  }>
                    {money(metricsData?.profitMetrics?.netProfitSold || 0)}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {startDate && endDate 
                    ? `Data for ${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`
                    : 'All time data'
                  }
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Sales Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={2} sx={{ mt: 1, height: 'calc(100% - 40px)' }}>
          {/* Sales Over Time Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Sales Revenue Over Time
              </Typography>
              
              <Box sx={{ flexGrow: 1, height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getRevenueByMonthData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={CustomTooltip} />
                    <Legend />
                    <Bar dataKey="amount" name="Revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {sales.length ? `Showing data for ${sales.length} sales` : 'No sales data available'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          {/* Sales By Category */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Sales By Category
              </Typography>
              
              <Box sx={{ flexGrow: 1, height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getSalesByCategoryData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                      nameKey="category"
                    >
                      {getSalesByCategoryData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={PieTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Distribution by product category
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Expenses Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={2} sx={{ mt: 1, height: 'calc(100% - 40px)' }}>
          {/* Expense Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Expense Distribution
              </Typography>
              
              <Box sx={{ flexGrow: 1, height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getExpenseDistributionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {getExpenseDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={PieTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Expenses: {money(metricsData?.expenseMetrics?.totalExpenses || 0)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          {/* Expense Details */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Expense Details
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Total Expenses</Typography>
                  <Typography variant="h6">
                    {money(metricsData?.expenseMetrics?.totalExpenses || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Month-over-Month Change</Typography>
                  <Typography 
                    variant="h6" 
                    color={(metricsData?.expenseMetrics?.expenseChange || 0) > 0 ? 'error.main' : 'success.main'}
                  >
                    {percentFormat(metricsData?.expenseMetrics?.expenseChange || 0)}
                  </Typography>
                </Box>
                
                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  Expenses by Type
                </Typography>
                
                {metricsData?.expenseMetrics?.expenseByType && Object.entries(metricsData.expenseMetrics.expenseByType).map(([type, amount], index) => (
                  <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">{type}</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {money(amount)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {expenses.length ? `Showing data for ${expenses.length} expenses` : 'No expense data available'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Profit & ROI Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={2} sx={{ mt: 1, height: 'calc(100% - 40px)' }}>
          {/* Profit Metrics */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                Profit Metrics
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Net Profit (Sold Items)</Typography>
                  <Typography 
                    variant="h6"
                    color={(metricsData?.profitMetrics?.netProfitSold || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {money(metricsData?.profitMetrics?.netProfitSold || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Net Profit Change</Typography>
                  <Typography 
                    variant="h6"
                    color={(metricsData?.profitMetrics?.netProfitChange || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {percentFormat(metricsData?.profitMetrics?.netProfitChange || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Potential Profit (Inventory)</Typography>
                  <Typography variant="h6" color="info.main">
                    {money(metricsData?.profitMetrics?.potentialProfit || 0)}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => fetchMetricsData()}
                >
                  Refresh Metrics
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* ROI Metrics */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}>
              <Typography variant="h6" gutterBottom>
                ROI Analysis
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">ROI on Sold Items</Typography>
                  <Typography 
                    variant="h6"
                    color={(metricsData?.profitMetrics?.roiSold || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {percentFormat(metricsData?.profitMetrics?.roiSold || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">ROI on Current Inventory</Typography>
                  <Typography 
                    variant="h6"
                    color={(metricsData?.profitMetrics?.roiInventory || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {percentFormat(metricsData?.profitMetrics?.roiInventory || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Overall ROI</Typography>
                  <Typography 
                    variant="h6"
                    color={(metricsData?.profitMetrics?.overallRoi || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {percentFormat(metricsData?.profitMetrics?.overallRoi || 0)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">ROI Change</Typography>
                  <Typography 
                    variant="h6"
                    color={(metricsData?.profitMetrics?.roiChange || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {percentFormat(metricsData?.profitMetrics?.roiChange || 0)}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {startDate && endDate 
                    ? `Data for ${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`
                    : 'All time data'
                  }
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ReportsSection;