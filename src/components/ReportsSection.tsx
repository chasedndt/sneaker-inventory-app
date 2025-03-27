// src/components/ReportsSection.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Grid, Box, useTheme } from '@mui/material';
import MetricsCard from './MetricsCard';
import { Item } from '../services/api';
import { Sale, salesApi, NetProfitResponse } from '../services/salesApi';
import { Expense } from '../models/expenses';
import { calculateTotalExpenses, isCurrentMonth } from '../utils/expensesUtils';
import { dashboardService, ComprehensiveMetrics } from '../services/dashboardService';
import { Dayjs } from 'dayjs';

// Props to include sales and expenses data and date filters
interface ReportsSectionProps {
  items: Item[];
  sales: Sale[];
  expenses: Expense[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}

// Generate mock data for the mini charts
const generateMockData = (baseValue: number, volatility: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `${i + 1}`,
    value: baseValue + Math.random() * volatility - volatility / 2
  }));
};

const ReportsSection: React.FC<ReportsSectionProps> = ({ 
  items, 
  sales, 
  expenses,
  startDate, 
  endDate 
}) => {
  const theme = useTheme();
  
  // State for dashboard metrics from the new comprehensive endpoint
  const [dashboardMetrics, setDashboardMetrics] = useState<ComprehensiveMetrics | null>(null);
  
  // State for net profit from sold items
  const [netProfitData, setNetProfitData] = useState<NetProfitResponse | null>(null);
  
  // Fetch dashboard metrics when date range changes
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        console.log('🚀 Starting to fetch dashboard metrics...');
        console.log('🗓️ Date range:', { 
          startDate: startDate?.format('YYYY-MM-DD'), 
          endDate: endDate?.format('YYYY-MM-DD') 
        });
        
        // Convert dayjs objects to Date objects if they exist
        const startDateObj = startDate ? startDate.toDate() : undefined;
        const endDateObj = endDate ? endDate.toDate() : undefined;
        
        // Call the API to get comprehensive metrics
        const metricsData = await dashboardService.fetchDashboardMetrics(startDateObj, endDateObj);
        
        // Update state with the fetched data
        setDashboardMetrics(metricsData);
        console.log('💾 State updated with dashboard metrics');
      } catch (error) {
        console.error('❌ Error fetching dashboard metrics:', error);
      }
    };
    
    fetchMetrics();
  }, [startDate, endDate]);
  
  // Fetch net profit from sold items when date range changes
  useEffect(() => {
    const fetchNetProfit = async () => {
      try {
        console.log('🚀 Starting to fetch net profit data...');
        console.log('🗓️ Date range:', { 
          startDate: startDate?.format('YYYY-MM-DD'), 
          endDate: endDate?.format('YYYY-MM-DD') 
        });
        
        // Convert dayjs objects to Date objects if they exist
        const startDateObj = startDate ? startDate.toDate() : undefined;
        const endDateObj = endDate ? endDate.toDate() : undefined;
        
        // Call the API to get net profit data
        const netProfitData = await salesApi.getNetProfit(startDateObj, endDateObj);
        
        // Update state with the fetched data
        setNetProfitData(netProfitData);
        console.log('💾 State updated with net profit data:', netProfitData);
      } catch (error) {
        console.error('❌ Error fetching net profit data:', error);
      }
    };
    
    fetchNetProfit();
  }, [startDate, endDate]);
  
  // Calculate metrics using local data as a fallback
  const fallbackMetrics = useMemo(() => {
    console.log('Calculating fallback metrics with:', { 
      itemsCount: items.length, 
      salesCount: sales.length,
      expensesCount: expenses.length
    });
    
    // Filter data based on date range if provided
    let filteredItems = [...items];
    let filteredSales = [...sales];
    let filteredExpenses = [...expenses];
    
    if (startDate && endDate) {
      const startTimestamp = startDate.startOf('day').valueOf();
      const endTimestamp = endDate.endOf('day').valueOf();
      
      // Filter items by purchase date
      filteredItems = items.filter(item => {
        const purchaseDate = new Date(item.purchaseDate).getTime();
        return purchaseDate >= startTimestamp && purchaseDate <= endTimestamp;
      });
      
      // Filter sales by sale date
      filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.saleDate).getTime();
        return saleDate >= startTimestamp && saleDate <= endTimestamp;
      });
      
      // Filter expenses by expense date
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate).getTime();
        return expenseDate >= startTimestamp && expenseDate <= endTimestamp;
      });
    }
    
    console.log('Filtered data:', { 
      filteredItemsCount: filteredItems.length, 
      filteredSalesCount: filteredSales.length,
      filteredExpensesCount: filteredExpenses.length
    });
    
    // Calculate total expenses
    const totalExpenseSpend = calculateTotalExpenses(filteredExpenses);
    
    // Calculate expenses change (comparing to previous period)
    let expenseSpendChange = 0;
    if (startDate && endDate) {
      const currentPeriodLength = endDate.diff(startDate, 'day');
      const previousStartDate = startDate.subtract(currentPeriodLength, 'day');
      const previousEndDate = startDate.subtract(1, 'day');
      
      // Get expenses from previous period
      const previousPeriodExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate).getTime();
        return expenseDate >= previousStartDate.valueOf() && expenseDate <= previousEndDate.valueOf();
      });
      
      const previousPeriodTotal = calculateTotalExpenses(previousPeriodExpenses);
      
      // Calculate percentage change
      if (previousPeriodTotal > 0) {
        expenseSpendChange = ((totalExpenseSpend - previousPeriodTotal) / previousPeriodTotal) * 100;
      }
    } else {
      // Default to 0% change if no date range is specified
      expenseSpendChange = 0;
    }
    
    // Ensure we're only using active inventory (not sold items)
    const activeItems = filteredItems.filter(item => item.status !== 'sold');
    
    // Sold items from filtered sales
    const soldItemsCount = filteredSales.length;
    
    // Calculate net profit (from items still in inventory)
    const inventoryProfit = activeItems.reduce((sum, item) => {
      const marketPrice = item.marketPrice || (item.purchasePrice * 1.2); // Default 20% markup
      return sum + (marketPrice - item.purchasePrice);
    }, 0);
    
    // Dynamically calculate profit from sold items by looking up each sale
    let soldItemsProfit = 0;
    console.log('Calculating profit from each sale:');
    filteredSales.forEach((sale, index) => {
      // Find the corresponding item that was sold
      const soldItem = items.find(item => item.id === sale.itemId);
      
      if (soldItem) {
        // Calculate profit for this sale
        const purchasePrice = soldItem.purchasePrice || 0;
        const salesTax = sale.salesTax || 0;
        const platformFees = sale.platformFees || 0;
        const shipping = soldItem.shippingPrice || 0;
        const saleProfit = sale.salePrice - purchasePrice - salesTax - platformFees - shipping;
        
        console.log(`Sale ${index + 1}:`, {
          id: sale.id,
          itemId: sale.itemId,
          salePrice: sale.salePrice,
          purchasePrice,
          salesTax,
          platformFees,
          shipping,
          calculatedProfit: saleProfit
        });
        
        // Add this sale's profit to the total
        soldItemsProfit += saleProfit;
      } else {
        console.warn(`Could not find item with id ${sale.itemId} for sale ${sale.id}`);
      }
    });
    
    console.log('Total calculated sold items profit:', soldItemsProfit);
    
    // Calculate sales income
    const salesIncome = filteredSales.reduce((sum, sale) => sum + sale.salePrice, 0);
    console.log('Sales income:', salesIncome);
    
    // Calculate total spend on inventory (only active items)
    const activeInventorySpend = activeItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    
    // Calculate total purchase value of sold items
    const soldItemsSpend = filteredSales.reduce((sum, sale) => {
      const soldItem = items.find(item => item.id === sale.itemId);
      return sum + (soldItem?.purchasePrice || 0);
    }, 0);
    
    // Calculate ROI (now including expenses)
    const totalSpend = activeInventorySpend + soldItemsSpend;
    const totalProfit = inventoryProfit + soldItemsProfit - totalExpenseSpend;
    const roi = totalSpend > 0 ? (totalProfit / totalSpend) * 100 : 0;
    
    // Calculate net profit (now including expenses)
    const netProfit = inventoryProfit - totalExpenseSpend;
    
    // For demonstration purposes, providing default changes
    const netProfitChange = -15.3; // This would ideally be calculated from previous period data
    const salesIncomeChange = 12.5;
    const itemSpendChange = -8.4;
    const roiChange = 5.2;
    const itemsPurchasedChange = 8.7;
    const itemsSoldChange = -12.5;
    const soldItemsProfitChange = -6.4;
    
    return {
      netProfit: netProfit,
      netProfitChange: netProfitChange,
      salesIncome: salesIncome,
      salesIncomeChange: salesIncomeChange,
      itemSpend: activeInventorySpend,
      itemSpendChange: itemSpendChange,
      roiPercentage: roi,
      roiChange: roiChange,
      expenseSpend: totalExpenseSpend,
      expenseSpendChange: expenseSpendChange,
      itemsPurchased: filteredItems.length,
      itemsPurchasedChange: itemsPurchasedChange,
      itemsSold: soldItemsCount,
      itemsSoldChange: itemsSoldChange,
      soldItemsProfit: soldItemsProfit,
      soldItemsProfitChange: soldItemsProfitChange
    };
  }, [items, sales, expenses, startDate, endDate]);
  
  // Use the metrics from the API if available, otherwise fall back to calculated values
  const metrics = dashboardMetrics ? {
    // Net Profit
    netProfit: dashboardMetrics.profitMetrics.potentialProfit,
    netProfitChange: dashboardMetrics.profitMetrics.netProfitChange,
    
    // Sales Income
    salesIncome: dashboardMetrics.salesMetrics.totalSalesRevenue,
    salesIncomeChange: dashboardMetrics.salesMetrics.revenueChange,
    
    // Item Spend
    itemSpend: dashboardMetrics.inventoryMetrics.totalInventoryCost,
    itemSpendChange: 0, // Not provided directly by the API
    
    // ROI
    roiPercentage: dashboardMetrics.profitMetrics.overallRoi,
    roiChange: dashboardMetrics.profitMetrics.roiChange,
    
    // Expenses
    expenseSpend: dashboardMetrics.expenseMetrics.totalExpenses,
    expenseSpendChange: dashboardMetrics.expenseMetrics.expenseChange,
    
    // Items metrics
    itemsPurchased: dashboardMetrics.inventoryMetrics.totalInventory,
    itemsPurchasedChange: 0, // Not provided directly by the API
    
    // Sold items
    itemsSold: dashboardMetrics.salesMetrics.totalSales,
    itemsSoldChange: 0, // Not provided directly by the API
  } : fallbackMetrics;
  
  // Get net profit from sold items from the dedicated API if available
  const netProfitSold = netProfitData ? 
    netProfitData.netProfitSold : 
    (dashboardMetrics ? dashboardMetrics.profitMetrics.netProfitSold : 0);
  
  const netProfitSoldChange = netProfitData ? 
    netProfitData.netProfitChange : 
    (dashboardMetrics ? dashboardMetrics.profitMetrics.netProfitChange : 0);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Net Profit"
            value={metrics.netProfit.toFixed(2)}
            change={metrics.netProfitChange}
            data={generateMockData(Math.max(1, metrics.netProfit) * 0.8, Math.max(1, metrics.netProfit) * 0.2)}
            tooltipText="Estimated profit based on market price difference minus purchase price and expenses"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Sales Income"
            value={metrics.salesIncome.toFixed(2)}
            change={metrics.salesIncomeChange}
            data={generateMockData(Math.max(1, metrics.salesIncome) * 0.8, Math.max(1, metrics.salesIncome) * 0.2)}
            tooltipText="Total revenue from all completed sales"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Item Spend"
            value={metrics.itemSpend.toFixed(2)}
            change={metrics.itemSpendChange}
            data={generateMockData(Math.max(1, metrics.itemSpend) * 0.8, Math.max(1, metrics.itemSpend) * 0.2)}
            tooltipText="Total amount spent on items currently in inventory"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="ROI Percentage"
            value={metrics.roiPercentage.toFixed(1)}
            change={metrics.roiChange}
            data={generateMockData(Math.max(1, metrics.roiPercentage) * 0.8, Math.max(1, metrics.roiPercentage) * 0.2)}
            prefix=""
            suffix="%"
            tooltipText="Return on investment calculated as ((Net Profit - Expenses) / Total Item Spend) × 100"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Expense Spend"
            value={metrics.expenseSpend.toFixed(2)}
            change={metrics.expenseSpendChange}
            data={generateMockData(Math.max(1, metrics.expenseSpend) * 0.8, Math.max(1, metrics.expenseSpend) * 0.2)}
            tooltipText="Total expenses excluding inventory purchases"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Items Purchased"
            value={metrics.itemsPurchased.toString()}
            change={metrics.itemsPurchasedChange}
            data={generateMockData(Math.max(1, metrics.itemsPurchased), 5)}
            prefix=""
            tooltipText="Total number of items purchased during the selected period"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Items Sold"
            value={metrics.itemsSold.toString()}
            change={metrics.itemsSoldChange}
            data={generateMockData(Math.max(1, metrics.itemsSold), 4)}
            prefix=""
            tooltipText="Total number of items sold during the selected period"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Net Profit from Sold Items"
            value={netProfitSold.toFixed(2)}
            change={netProfitSoldChange}
            data={generateMockData(Math.max(1, netProfitSold) * 0.8, Math.max(1, netProfitSold) * 0.2)}
            tooltipText="Realized profit from actual sales minus expenses, shipping costs, platform fees, and sales tax"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsSection;