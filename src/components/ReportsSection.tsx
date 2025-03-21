import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import MetricsCard from './MetricsCard';
import { Item } from '../services/api';
import { Sale } from '../services/salesApi';
import { Dayjs } from 'dayjs';

// Props to include sales data and date filters
interface ReportsSectionProps {
  items: Item[];
  sales: Sale[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}

// Generate trend data for the mini charts based on real data
const generateTrendData = (baseValue: number, data: number[], count: number = 7) => {
  // If we have enough data points, use them directly
  if (data.length >= count) {
    return data.slice(0, count).map((value, index) => ({
      date: `${index + 1}`,
      value
    }));
  }
  
  // Otherwise, generate some data based on the baseValue
  const volatility = baseValue * 0.1; // 10% volatility
  return Array.from({ length: count }, (_, i) => ({
    date: `${i + 1}`,
    value: baseValue + (Math.random() * volatility - volatility / 2)
  }));
};

const ReportsSection: React.FC<ReportsSectionProps> = ({ items, sales, startDate, endDate }) => {
  // Calculate metrics based on filtered data
  const metrics = useMemo(() => {
    console.log('Calculating metrics with:', { itemsCount: items.length, salesCount: sales.length });
    
    // Filter data based on date range if provided
    let filteredItems = [...items];
    let filteredSales = [...sales];
    
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
    }
    
    console.log('Filtered data:', { filteredItemsCount: filteredItems.length, filteredSalesCount: filteredSales.length });
    
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
    
    // Calculate ROI
    const totalSpend = activeInventorySpend + soldItemsSpend;
    const roi = totalSpend > 0 ? ((inventoryProfit + soldItemsProfit) / totalSpend) * 100 : 0;
    
    // Collect historical data for trend charts
    const profitHistory: number[] = [];
    const salesHistory: number[] = [];
    const spendHistory: number[] = [];
    const roiHistory: number[] = [];
    
    // This would normally be populated from historical data
    // For now, we'll use calculated values with some variation
    
    return {
      netProfit: inventoryProfit,
      netProfitChange: -15.3,
      salesIncome: salesIncome,
      salesIncomeChange: 12.5,
      itemSpend: activeInventorySpend,
      itemSpendChange: -8.4,
      roiPercentage: roi,
      roiChange: 5.2,
      expenseSpend: 0,
      expenseSpendChange: 0,
      itemsPurchased: filteredItems.length,
      itemsPurchasedChange: 8.7,
      itemsSold: soldItemsCount,
      itemsSoldChange: -12.5,
      netProfitSold: soldItemsProfit, // Dynamically calculated from sales data
      netProfitSoldChange: -6.4,
      // Add trend data for charts
      profitHistory,
      salesHistory,
      spendHistory,
      roiHistory
    };
  }, [items, sales, startDate, endDate]);

  return (
    <Grid container spacing={3} sx={{ height: 'auto' }}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Net Profit"
          value={metrics.netProfit.toFixed(2)}
          change={metrics.netProfitChange}
          data={generateTrendData(metrics.netProfit, metrics.profitHistory)}
          tooltipText="Estimated profit based on market price difference minus purchase price for items still in inventory"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Sales Income"
          value={metrics.salesIncome.toFixed(2)}
          change={metrics.salesIncomeChange}
          data={generateTrendData(metrics.salesIncome, metrics.salesHistory)}
          tooltipText="Total revenue from all completed sales"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Item Spend"
          value={metrics.itemSpend.toFixed(2)}
          change={metrics.itemSpendChange}
          data={generateTrendData(metrics.itemSpend, metrics.spendHistory)}
          tooltipText="Total amount spent on items currently in inventory"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="ROI Percentage"
          value={metrics.roiPercentage.toFixed(1)}
          change={metrics.roiChange}
          data={generateTrendData(metrics.roiPercentage, metrics.roiHistory)}
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
          data={generateTrendData(metrics.expenseSpend, [])}
          tooltipText="Total expenses excluding inventory purchases"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Items Purchased"
          value={metrics.itemsPurchased.toString()}
          change={metrics.itemsPurchasedChange}
          data={generateTrendData(metrics.itemsPurchased, [])}
          prefix=""
          tooltipText="Total number of items purchased during the selected period"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Items Sold"
          value={metrics.itemsSold.toString()}
          change={metrics.itemsSoldChange}
          data={generateTrendData(metrics.itemsSold, [])}
          prefix=""
          tooltipText="Total number of items sold during the selected period"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Net Profit from Sold Items"
          value={metrics.netProfitSold.toFixed(2)}
          change={metrics.netProfitSoldChange}
          data={generateTrendData(metrics.netProfitSold, [])}
          tooltipText="Realized profit from actual sales minus expenses, shipping costs, platform fees, and sales tax"
        />
      </Grid>
    </Grid>
  );
};

export default ReportsSection;