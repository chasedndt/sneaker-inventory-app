// src/components/ReportsSection.tsx
import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import MetricsCard from './MetricsCard';
import { Item } from '../services/api';

// Props with items to properly filter out sold items
interface ReportsSectionProps {
  items: Item[];
}

// Generate mock data for the mini charts
const generateMockData = (baseValue: number, volatility: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `${i + 1}`,
    value: baseValue + Math.random() * volatility - volatility / 2
  }));
};

const ReportsSection: React.FC<ReportsSectionProps> = ({ items }) => {
  // FIX FOR ISSUE 2.2: Calculate metrics based on active inventory only
  const metrics = useMemo(() => {
    // Ensure we're only using active inventory (not sold items)
    const activeItems = items.filter(item => item.status !== 'sold');
    
    // Sold items (from API or mock)
    const soldItems = items.filter(item => item.status === 'sold');
    
    // Calculate net profit (from sold items)
    const totalSales = soldItems.reduce((sum, item) => {
      // Estimate sale price as 120% of purchase price for simplicity
      const estimatedSalePrice = item.marketPrice || (item.purchasePrice * 1.2);
      return sum + estimatedSalePrice;
    }, 0);
    const totalPurchaseCostForSold = soldItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    const netProfit = totalSales - totalPurchaseCostForSold;
    
    // Calculate ROI
    const roi = totalPurchaseCostForSold > 0 ? (netProfit / totalPurchaseCostForSold) * 100 : 0;
    
    // Total spend on inventory (only active items)
    const activeInventorySpend = activeItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    
    return {
      netProfit,
      netProfitChange: -15.3, // Example value
      salesIncome: totalSales,
      salesIncomeChange: 12.5, // Example value
      itemSpend: activeInventorySpend,
      itemSpendChange: -8.4, // Example value
      roiPercentage: roi,
      roiChange: 5.2, // Example value
      subscriptionSpend: 0,
      subscriptionSpendChange: 0,
      itemsPurchased: activeItems.length,
      itemsPurchasedChange: 8.7, // Example value
      itemsSold: soldItems.length,
      itemsSoldChange: -12.5, // Example value
      totalSpend: activeInventorySpend // This is active inventory spend
    };
  }, [items]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Net Profit"
          value={metrics.netProfit.toFixed(2)}
          change={metrics.netProfitChange}
          data={generateMockData(2000, 400)}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Sales Income"
          value={metrics.salesIncome.toFixed(2)}
          change={metrics.salesIncomeChange}
          data={generateMockData(5000, 800)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Item Spend"
          value={metrics.itemSpend.toFixed(2)}
          change={metrics.itemSpendChange}
          data={generateMockData(7000, 1000)}
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
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Subscription Spend"
          value={metrics.subscriptionSpend.toFixed(2)}
          change={metrics.subscriptionSpendChange}
          data={generateMockData(0, 0)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Items Purchased"
          value={metrics.itemsPurchased.toString()}
          change={metrics.itemsPurchasedChange}
          data={generateMockData(metrics.itemsPurchased, 5)}
          prefix=""
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Items Sold"
          value={metrics.itemsSold.toString()}
          change={metrics.itemsSoldChange}
          data={generateMockData(metrics.itemsSold, 4)}
          prefix=""
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Active Inventory Value" // Updated title to clarify
          value={metrics.totalSpend.toFixed(2)}
          change={metrics.itemSpendChange}
          data={generateMockData(7000, 1000)}
        />
      </Grid>
    </Grid>
  );
};

export default ReportsSection;