// src/components/ReportsSection.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Item } from '../services/api';
import { Sale } from '../services/salesApi';
import { Expense } from '../models/expenses';
import useFormat from '../hooks/useFormat';
import { dashboardService, ComprehensiveMetrics } from '../services/dashboardService';
import { User } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import MetricsCard from './MetricsCard';

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

// Main component definition
const ReportsSection: React.FC<ReportsSectionProps> = ({
  items,
  sales,
  expenses,
  startDate,
  endDate,
  currentUser: propCurrentUser
}) => {
  const theme = useTheme();
  const { money, percentFormat } = useFormat();
  const { currentUser: ctxUser } = useAuth();

  const currentUser = propCurrentUser ?? ctxUser;

  // State for metrics data
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch comprehensive KPI metrics with authentication
  const fetchMetricsData = async () => {
    if (!currentUser) {
      setError('Authentication required to fetch metrics data');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiStartDate = startDate ? startDate.toDate() : undefined;
      const apiEndDate = endDate ? endDate.toDate() : undefined;
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

  if (!currentUser) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning">
          Please log in to view your metrics and reports.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
          <Button onClick={fetchMetricsData} sx={{ ml: 2 }} size="small" variant="outlined">
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!metricsData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No metrics data available.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try adjusting the date filters or ensure data has been recorded.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => fetchMetricsData()}
          sx={{ mt: 2 }}
        >
          Fetch Data
        </Button>
      </Box>
    );
  }

  // KPI Definitions based on user input
  const kpiNetProfit = metricsData.inventoryMetrics?.potentialProfit || 0;
  const kpiSalesIncome = metricsData.salesMetrics?.totalSalesRevenue || 0;
  const kpiItemSpend = 0; // Placeholder - Needs backend data for 'spend in period'
  // Format ROI percentage to 2 decimal places
  const kpiROIPercentage = Number((metricsData.profitMetrics?.roiSold || 0).toFixed(2));
  const kpiExpenseSpend = metricsData.expenseMetrics?.totalExpenses || 0;
  // Placeholder for 'Items Purchased (in period)' - using total inventory count for now
  const kpiItemsPurchased = metricsData.inventoryMetrics?.totalInventory || 0; 
  const kpiItemsSold = metricsData.salesMetrics?.totalSales || 0;
  // Calculate realized profit directly from filtered sales and expenses data
  // Filter sales by date range if specified
  const filteredSales = startDate && endDate ? sales.filter(sale => {
    const saleDate = new Date(sale.saleDate);
    return saleDate >= startDate.toDate() && saleDate <= endDate.toDate();
  }) : sales;
  
  // Filter expenses by date range if specified
  const filteredExpenses = startDate && endDate ? expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate);
    return expenseDate >= startDate.toDate() && expenseDate <= endDate.toDate();
  }) : expenses;
  
  // Calculate total PROFIT from sales (not just revenue)
  // This means: Sale Price - Purchase Price - Platform Fees - Shipping
  const actualSalesProfit = filteredSales.reduce((total, sale) => {
    // Get the purchase price of the item (cost of goods sold)
    const purchasePrice = sale.purchasePrice || 0;
    // Get the sale price
    const salePrice = sale.salePrice || 0;
    // Get platform fees
    const platformFees = sale.platformFees || 0;
    // Get shipping costs if available (property is shippingPrice in the Sale interface)
    const shippingCost = sale.shippingPrice || 0;
    // Calculate profit for this sale
    const saleProfit = salePrice - purchasePrice - platformFees - shippingCost;
    
    console.log(`Sale ID: ${sale.id}, Sale price: $${salePrice}, Purchase price: $${purchasePrice}, Platform fees: $${platformFees}, Shipping: $${shippingCost}, Profit: $${saleProfit}`);
    
    return total + saleProfit;
  }, 0);
  
  // Calculate total expenses from filtered expenses
  const actualExpensesTotal = filteredExpenses.reduce((total, expense) => {
    console.log(`Expense: ${expense.expenseType}, Amount: $${expense.amount}`);
    return total + (expense.amount || 0);
  }, 0);
  
  // Calculate realized profit (actual profit from sales - expenses)
  const kpiRealizedProfitExpenses = actualSalesProfit - actualExpensesTotal;
  
  console.log('-------- DETAILED CALCULATION BREAKDOWN --------');
  console.log('Date range:', startDate?.format('MM/DD/YYYY') || 'all', 'to', endDate?.format('MM/DD/YYYY') || 'all');
  console.log('Filtered sales count:', filteredSales.length);
  console.log('Filtered expenses count:', filteredExpenses.length);
  console.log('TOTAL SALES REVENUE:', filteredSales.reduce((t, s) => t + (s.salePrice || 0), 0));
  console.log('COST OF GOODS SOLD:', filteredSales.reduce((t, s) => t + (s.purchasePrice || 0), 0));
  console.log('PLATFORM FEES:', filteredSales.reduce((t, s) => t + (s.platformFees || 0), 0));
  console.log('SHIPPING COSTS:', filteredSales.reduce((t, s) => t + (s.shippingPrice || 0), 0));
  console.log('ACTUAL SALES PROFIT:', actualSalesProfit);
  console.log('ACTUAL EXPENSES TOTAL:', actualExpensesTotal);
  console.log('REALIZED PROFIT CALCULATION:', actualSalesProfit, '-', actualExpensesTotal, '=', kpiRealizedProfitExpenses);
  console.log('-------- END CALCULATION BREAKDOWN --------');

  // Change data (placeholders where specific change not available)
  const changeNetProfit = metricsData.profitMetrics?.netProfitChange || 0; // This is for sold profit, might not align with potential inventory profit
  const changeSalesIncome = metricsData.salesMetrics?.revenueChange || 0;
  const changeItemSpend = 0; // Placeholder
  const changeROIPercentage = metricsData.profitMetrics?.roiChange || 0;
  const changeExpenseSpend = metricsData.expenseMetrics?.expenseChange || 0;
  const changeItemsPurchased = 0; // Placeholder
  const changeItemsSold = 0; // Placeholder
  const changeRealizedProfitExpenses = 0; // Placeholder

  return (
    <Box sx={{ width: '100%', p: 0, m: 0 }}> 
      <Grid container spacing={1.5}> 
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title={<>Net Profit <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Unsold)</Typography></>}
            value={kpiNetProfit}
            change={changeNetProfit} 
            data={[]}
            tooltipText="Potential profit from current unlisted and listed inventory (Market Price - Purchase Price)."
            useFormatter={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Sales Income" // No suffix needed here
            value={kpiSalesIncome}
            change={changeSalesIncome}
            data={[]}
            tooltipText="Total revenue from sales in the selected period."
            useFormatter={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title={<>Item Spend <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>}
            value={kpiItemSpend} // Placeholder
            change={changeItemSpend} // Placeholder
            data={[]}
            tooltipText="Total cost of items acquired/purchased by the user within the selected period. (Data pending backend update)"
            useFormatter={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title={<>ROI Percentage <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Sold)</Typography></>}
            value={kpiROIPercentage}
            change={changeROIPercentage}
            data={[]}
            suffix="%"
            tooltipText="Return on Investment for items sold in the selected period."
            useFormatter={false} // Percentage, not currency
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title={<>Expense Spend <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>}
            value={kpiExpenseSpend}
            change={changeExpenseSpend}
            data={[]}
            tooltipText="Total business expenses logged within the selected period."
            useFormatter={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title={<>Items Purchased <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>}
            value={kpiItemsPurchased} // Placeholder (currently total inventory count)
            change={changeItemsPurchased} // Placeholder
            data={[]}
            tooltipText="Count of new items acquired by the user within the selected period. (Data pending backend update - currently shows total inventory)"
            useFormatter={false} // Count, not currency
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title={<>Items Sold <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>}
            value={kpiItemsSold}
            change={changeItemsSold} // Placeholder
            data={[]}
            tooltipText="Count of items sold within the selected period."
            useFormatter={false} // Count, not currency
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Realized Profit - Expenses" // No suffix needed here
            value={kpiRealizedProfitExpenses}
            change={changeRealizedProfitExpenses} // Placeholder
            data={[]}
            tooltipText="(Sales Revenue - COGS - Platform Fees) - General Business Expenses for the selected period."
            useFormatter={true}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsSection;