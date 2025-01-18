import React from 'react';
import { Grid } from '@mui/material';
import MetricsCard from './MetricsCard';

// Mock data for the mini charts
const generateMockData = (baseValue: number, volatility: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `${i + 1}`,
    value: baseValue + Math.random() * volatility - volatility / 2
  }));
};

const ReportsSection: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Net Profit"
          value="1,987.29"
          change={-15.3}
          data={generateMockData(2000, 400)}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Sales Income"
          value="4,902.66"
          change={12.5}
          data={generateMockData(5000, 800)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Item Spend"
          value="6,889.95"
          change={-8.4}
          data={generateMockData(7000, 1000)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="ROI Percentage"
          value="27.5"
          change={5.2}
          data={generateMockData(25, 5)}
          prefix=""
          suffix="%"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Subscription Spend"
          value="0.00"
          change={0}
          data={generateMockData(0, 0)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Items Purchased"
          value="25"
          change={8.7}
          data={generateMockData(25, 5)}
          prefix=""
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Items Sold"
          value="16"
          change={-12.5}
          data={generateMockData(16, 4)}
          prefix=""
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Total Spend"
          value="6,889.95"
          change={-8.4}
          data={generateMockData(7000, 1000)}
        />
      </Grid>
    </Grid>
  );
};

export default ReportsSection;
