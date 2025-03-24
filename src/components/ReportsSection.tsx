// src/components/ReportsSection.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Grid, Box, useTheme } from '@mui/material';
import MetricsCard from './MetricsCard';
import { Item } from '../services/api';
import { Sale, salesApi } from '../services/salesApi';
import { Expense } from '../models/expenses';
import { calculateTotalExpenses, isCurrentMonth } from '../utils/expensesUtils';
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
  
  // Add state for real net profit from sold items
  const [netProfitSold, setNetProfitSold] = useState<number>(0);
  const [netProfitSoldChange, setNetProfitSoldChange] = useState<number>(-6.4); // Default value
  
  // Fetch net profit from sold items data
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
        
        // Call the API to get real net profit data
        console.log('📞 Calling salesApi.getNetProfit with dates:', { 
          startDateObj, 
          endDateObj 
        });
        
        const netProfitData = await salesApi.getNetProfit(startDateObj, endDateObj);
        
        // Log the response
        console.log('📊 API response for net profit:', netProfitData);
        
        // Update state with the real data
        setNetProfitSold(netProfitData.netProfitSold);
        console.log('💾 State updated with new net profit value:', netProfitData.netProfitSold);
        
        // For the percentage change, you could implement a similar API call to get previous period data
        // For now, we'll keep the mock value
      } catch (error) {
        console.error('❌ Error fetching net profit data:', error);
      }
    };
    
    fetchNetProfit();
  }, [startDate, endDate]);
  
  // Calculate metrics based on filtered data
  const metrics = useMemo(() => {
    console.log('Calculating metrics with:', { 
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
        const saleProfit = sale.salePrice - purchasePrice - salesTax - platformFees;
        
        console.log(`Sale ${index + 1}:`, {
          id: sale.id,
          itemId: sale.itemId,
          salePrice: sale.salePrice,
          purchasePrice,
          salesTax,
          platformFees,
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
    
    // Calculate net profit change
    const netProfitChange = -15.3; // This would be calculated dynamically based on previous period
    
    return {
      netProfit: netProfit,
      netProfitChange: netProfitChange,
      salesIncome: salesIncome,
      salesIncomeChange: 12.5,
      itemSpend: activeInventorySpend,
      itemSpendChange: -8.4,
      roiPercentage: roi,
      roiChange: 5.2,
      expenseSpend: totalExpenseSpend,
      expenseSpendChange: expenseSpendChange,
      itemsPurchased: filteredItems.length,
      itemsPurchasedChange: 8.7,
      itemsSold: soldItemsCount,
      itemsSoldChange: -12.5,
      // We're not using this calculated value anymore, but keeping it for reference
      soldItemsProfit: soldItemsProfit,
      soldItemsProfitChange: -6.4
    };
  }, [items, sales, expenses, startDate, endDate]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Net Profit"
            value={metrics.netProfit.toFixed(2)}
            change={metrics.netProfitChange}
            data={generateMockData(2000, 400)}
            tooltipText="Estimated profit based on market price difference minus purchase price and expenses"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Sales Income"
            value={metrics.salesIncome.toFixed(2)}
            change={metrics.salesIncomeChange}
            data={generateMockData(5000, 800)}
            tooltipText="Total revenue from all completed sales"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Item Spend"
            value={metrics.itemSpend.toFixed(2)}
            change={metrics.itemSpendChange}
            data={generateMockData(7000, 1000)}
            tooltipText="Total amount spent on items currently in inventory"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="ROI Percentage"
            value={metrics.roiPercentage.toFixed(1)}
            change={metrics.roiChange}
            data={generateMockData(25, 5)}
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
            data={generateMockData(metrics.expenseSpend * 0.8, metrics.expenseSpend * 0.2)}
            tooltipText="Total expenses excluding inventory purchases"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Items Purchased"
            value={metrics.itemsPurchased.toString()}
            change={metrics.itemsPurchasedChange}
            data={generateMockData(metrics.itemsPurchased, 5)}
            prefix=""
            tooltipText="Total number of items purchased during the selected period"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Items Sold"
            value={metrics.itemsSold.toString()}
            change={metrics.itemsSoldChange}
            data={generateMockData(metrics.itemsSold, 4)}
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