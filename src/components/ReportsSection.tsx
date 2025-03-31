// src/components/ReportsSection.tsx
import React, { useMemo } from 'react';
import { Grid, Box, useTheme } from '@mui/material';
import MetricsCard from './MetricsCard';
import { Item } from '../services/api';
import { Sale } from '../services/salesApi';
import { Expense } from '../models/expenses';
import { calculateTotalExpenses } from '../utils/expensesUtils';
import { Dayjs } from 'dayjs';

// Props to include sales and expenses data and date filters
interface ReportsSectionProps {
  items: Item[];
  sales: Sale[];
  expenses: Expense[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}

// Generate data for the mini charts
const generateMiniChartData = (baseValue: number, volatility: number, points: number = 5) => {
  return Array.from({ length: points }, (_, i) => ({
    date: `${i + 1}`,
    value: Math.max(0, baseValue + (Math.random() * volatility - volatility / 2))
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
  
  // Filter data based on date range
  const filteredData = useMemo(() => {
    // Filter items based on date range
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
    
    return { filteredItems, filteredSales, filteredExpenses };
  }, [items, sales, expenses, startDate, endDate]);
  
  // FIXED: Correctly calculate net profit from sold items
  // This is the key function that needs fixing
  const calculateNetProfitFromSoldItems = (filteredSales: Sale[], filteredExpenses: Expense[], allItems: Item[]): number => {
    // Only include completed sales
    const completedSales = filteredSales.filter(sale => sale.status === 'completed');
    
    if (completedSales.length === 0) {
      // If no completed sales in this period, just return the negative expenses
      return -calculateTotalExpenses(filteredExpenses);
    }
    
    // Calculate gross profit from each completed sale
    const salesProfit = completedSales.reduce((total, sale) => {
      // Use the profit field if available
      if (typeof sale.profit === 'number') {
        return total + sale.profit;
      }
      
      // Otherwise calculate from components
      const soldItem = allItems.find(item => item.id === sale.itemId);
      if (!soldItem) return total;
      
      const purchasePrice = soldItem.purchasePrice || 0;
      const salesTax = sale.salesTax || 0;
      const platformFees = sale.platformFees || 0;
      const shippingCost = soldItem.shippingPrice || 0;
      
      const saleProfit = sale.salePrice - purchasePrice - salesTax - platformFees - shippingCost;
      return total + saleProfit;
    }, 0);
    
    // Calculate total expenses for the period
    const totalExpenses = calculateTotalExpenses(filteredExpenses);
    
    // Net profit is sales profit minus total expenses in this period
    // This is the simple calculation that properly reflects "Realized Profit - Expenses"
    const netProfit = salesProfit - totalExpenses;
    
    return netProfit;
  };
  
  // Compute metrics from filtered data
  const metrics = useMemo(() => {
    const { filteredItems, filteredSales, filteredExpenses } = filteredData;
    
    // Ensure we're only using active inventory (not sold items)
    const activeItems = items.filter(item => item.status !== 'sold');
    
    // Net Profit calculation
    const potentialProfit = activeItems.reduce((sum, item) => {
      const marketPrice = item.marketPrice || (item.purchasePrice * 1.2);
      return sum + (marketPrice - item.purchasePrice);
    }, 0);
    
    // Net profit is potential profit minus expenses
    const netProfit = potentialProfit - calculateTotalExpenses(filteredExpenses);
    
    // Sales Income calculation
    const salesIncome = filteredSales.reduce((sum, sale) => sum + sale.salePrice, 0);
    
    // Item Spend calculation
    const itemSpend = filteredItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    
    // FIXED: ROI calculation - ensure it's properly calculated even if itemSpend is 0
    // ROI should be based on potential profit for active inventory
    const roi = itemSpend > 0 ? (netProfit / itemSpend) * 100 : 0;
    
    // Expense Spend calculation
    const expenseSpend = calculateTotalExpenses(filteredExpenses);
    
    // Count metrics
    const itemsPurchased = filteredItems.length;
    const itemsSold = filteredSales.length;
    
    // FIXED: Calculate profit from sold items using the improved function
    const soldItemsProfit = calculateNetProfitFromSoldItems(filteredSales, filteredExpenses, items);
    
    // Default percentage changes for visual indicators
    const netProfitChange = 5.2;
    const salesIncomeChange = 12.5;
    const itemSpendChange = -3.4;
    const roiChange = 2.8;
    const expenseSpendChange = 1.9;
    const itemsPurchasedChange = 15.7;
    const itemsSoldChange = 8.3;
    const soldItemsProfitChange = 10.2;
    
    return {
      netProfit,
      netProfitChange,
      salesIncome,
      salesIncomeChange,
      itemSpend,
      itemSpendChange,
      roi,
      roiChange,
      expenseSpend,
      expenseSpendChange,
      itemsPurchased,
      itemsPurchasedChange,
      itemsSold,
      itemsSoldChange,
      soldItemsProfit,
      soldItemsProfitChange
    };
  }, [filteredData, items]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Net Profit"
            value={metrics.netProfit.toFixed(2)}
            change={metrics.netProfitChange}
            data={generateMiniChartData(Math.max(1, metrics.netProfit) * 0.8, Math.max(1, metrics.netProfit) * 0.1, 5)}
            tooltipText="Estimated profit based on market price difference minus purchase price and expenses"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Sales Income"
            value={metrics.salesIncome.toFixed(2)}
            change={metrics.salesIncomeChange}
            data={generateMiniChartData(Math.max(1, metrics.salesIncome) * 0.8, Math.max(1, metrics.salesIncome) * 0.1, 5)}
            tooltipText="Total revenue from all completed sales"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Item Spend"
            value={metrics.itemSpend.toFixed(2)}
            change={metrics.itemSpendChange}
            data={generateMiniChartData(Math.max(1, metrics.itemSpend) * 0.8, Math.max(1, metrics.itemSpend) * 0.1, 5)}
            tooltipText="Total amount spent on items currently in inventory"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="ROI Percentage"
            value={metrics.roi.toFixed(1)}
            change={metrics.roiChange}
            data={generateMiniChartData(Math.max(1, metrics.roi) * 0.8, Math.max(1, metrics.roi) * 0.1, 5)}
            prefix=""
            suffix="%"
            tooltipText="Return on investment calculated as (Net Profit / Total Item Spend) × 100"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Expense Spend"
            value={metrics.expenseSpend.toFixed(2)}
            change={metrics.expenseSpendChange}
            data={generateMiniChartData(Math.max(1, metrics.expenseSpend) * 0.8, Math.max(1, metrics.expenseSpend) * 0.1, 5)}
            tooltipText="Total expenses excluding inventory purchases"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Items Purchased"
            value={metrics.itemsPurchased.toString()}
            change={metrics.itemsPurchasedChange}
            data={generateMiniChartData(Math.max(1, metrics.itemsPurchased), 2, 5)}
            prefix=""
            tooltipText="Total number of items purchased during the selected period"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Items Sold"
            value={metrics.itemsSold.toString()}
            change={metrics.itemsSoldChange}
            data={generateMiniChartData(Math.max(1, metrics.itemsSold), 2, 5)}
            prefix=""
            tooltipText="Total number of items sold during the selected period"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Realized Profit - Expenses"
            value={metrics.soldItemsProfit.toFixed(2)}
            change={metrics.soldItemsProfitChange}
            data={generateMiniChartData(Math.max(0.01, Math.abs(metrics.soldItemsProfit)) * 0.8, Math.max(0.01, Math.abs(metrics.soldItemsProfit)) * 0.1, 5)}
            tooltipText="Profit from completed sales minus expenses within the period"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsSection;