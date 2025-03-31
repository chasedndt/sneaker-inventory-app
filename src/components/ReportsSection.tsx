// src/components/ReportsSection.tsx
import React, { useMemo, useEffect } from 'react';
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
  
  // Add direct debugging to see what data is coming in
  useEffect(() => {
    console.log('🔍 ReportsSection Props:', {
      itemsCount: items.length,
      salesCount: sales.length,
      expensesCount: expenses.length,
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD')
    });
    
    // Debug completed sales
    const completedSales = sales.filter(sale => sale.status === 'completed');
    console.log('✅ Completed Sales:', completedSales);
    
    // Debug expenses
    console.log('💰 Expenses:', expenses);
  }, [items, sales, expenses, startDate, endDate]);
  
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
    
    // Debug filtered data
    console.log('🔍 Filtered Data:', {
      filteredItemsCount: filteredItems.length,
      filteredSalesCount: filteredSales.length,
      filteredExpensesCount: filteredExpenses.length
    });
    
    return { filteredItems, filteredSales, filteredExpenses };
  }, [items, sales, expenses, startDate, endDate]);
  
  // FIXED: Manual calculation of profit for completed sales
  const calculateSaleProfit = (sale: Sale, allItems: Item[]): number => {
    // Find the corresponding item
    const soldItem = allItems.find(item => item.id === sale.itemId);
    if (!soldItem) return 0;
    
    const purchasePrice = soldItem.purchasePrice || 0;
    const salesTax = sale.salesTax || 0;
    const platformFees = sale.platformFees || 0;
    const shippingCost = soldItem.shippingPrice || 0;
    
    return sale.salePrice - purchasePrice - salesTax - platformFees - shippingCost;
  };

  // DIRECT FIX: Calculate net profit from sold items with detailed logging
  const calculateNetProfitFromSoldItems = (filteredSales: Sale[], filteredExpenses: Expense[], allItems: Item[]): number => {
    console.log('🔎 Starting calculateNetProfitFromSoldItems calculation...');
    
    // Only include completed sales
    const completedSales = filteredSales.filter(sale => sale.status === 'completed');
    console.log(`✅ Found ${completedSales.length} completed sales in filtered data`);
    
    if (completedSales.length === 0) {
      console.log('⚠️ No completed sales found, returning negative expenses');
      const totalExpenses = calculateTotalExpenses(filteredExpenses);
      return -totalExpenses;
    }
    
    // Calculate gross profit from each completed sale
    let salesProfit = 0;
    completedSales.forEach(sale => {
      let saleProfit = 0;
      
      // Use manual calculation for every sale to ensure consistency
      saleProfit = calculateSaleProfit(sale, allItems);
      salesProfit += saleProfit;
      
      console.log(`📊 Sale ID ${sale.id}: Profit = $${saleProfit.toFixed(2)}`);
    });
    
    console.log(`💵 Total sales profit: $${salesProfit.toFixed(2)}`);
    
    // Calculate total expenses for the period
    const totalExpenses = calculateTotalExpenses(filteredExpenses);
    console.log(`💸 Total expenses: $${totalExpenses.toFixed(2)}`);
    
    // Net profit is sales profit minus total expenses in this period
    const netProfit = salesProfit - totalExpenses;
    console.log(`🧮 Final calculation: $${salesProfit.toFixed(2)} - $${totalExpenses.toFixed(2)} = $${netProfit.toFixed(2)}`);
    
    return netProfit;
  };
  
  // Compute metrics from filtered data
  const metrics = useMemo(() => {
    console.log('🔄 Recalculating metrics...');
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
    
    // ROI calculation
    const roi = itemSpend > 0 ? (netProfit / itemSpend) * 100 : 0;
    
    // Expense Spend calculation
    const expenseSpend = calculateTotalExpenses(filteredExpenses);
    
    // Count metrics
    const itemsPurchased = filteredItems.length;
    const itemsSold = filteredSales.length;
    
    // Calculate profit from sold items - DIRECTLY CALCULATE RATHER THAN RELYING ON PROPS
    const soldItemsProfit = calculateNetProfitFromSoldItems(filteredSales, filteredExpenses, items);
    
    // Debug the final metrics
    console.log('📊 Final metrics:', {
      netProfit,
      salesIncome,
      itemSpend,
      roi,
      expenseSpend,
      itemsPurchased,
      itemsSold,
      soldItemsProfit
    });
    
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

  // Log metrics whenever they change
  useEffect(() => {
    console.log('📈 Updated metrics:', metrics);
  }, [metrics]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid container spacing={3}>
        {/* Net Profit */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Net Profit"
            value={metrics.netProfit.toFixed(2)}
            change={metrics.netProfitChange}
            data={generateMiniChartData(Math.max(1, metrics.netProfit) * 0.8, Math.max(1, metrics.netProfit) * 0.1, 5)}
            tooltipText="Estimated profit based on market price difference minus purchase price and expenses"
          />
        </Grid>
        
        {/* Sales Income */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Sales Income"
            value={metrics.salesIncome.toFixed(2)}
            change={metrics.salesIncomeChange}
            data={generateMiniChartData(Math.max(1, metrics.salesIncome) * 0.8, Math.max(1, metrics.salesIncome) * 0.1, 5)}
            tooltipText="Total revenue from all completed sales"
          />
        </Grid>

        {/* Item Spend */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Item Spend"
            value={metrics.itemSpend.toFixed(2)}
            change={metrics.itemSpendChange}
            data={generateMiniChartData(Math.max(1, metrics.itemSpend) * 0.8, Math.max(1, metrics.itemSpend) * 0.1, 5)}
            tooltipText="Total amount spent on items currently in inventory"
          />
        </Grid>

        {/* ROI Percentage */}
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

        {/* Expense Spend */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Expense Spend"
            value={metrics.expenseSpend.toFixed(2)}
            change={metrics.expenseSpendChange}
            data={generateMiniChartData(Math.max(1, metrics.expenseSpend) * 0.8, Math.max(1, metrics.expenseSpend) * 0.1, 5)}
            tooltipText="Total expenses excluding inventory purchases"
          />
        </Grid>

        {/* Items Purchased */}
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

        {/* Items Sold */}
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

        {/* Realized Profit - Expenses */}
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