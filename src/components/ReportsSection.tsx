// src/components/ReportsSection.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
  useTheme,
  CircularProgress,
  ClickAwayListener,
  Alert
} from '@mui/material';
import { Dayjs } from 'dayjs';
import UpgradeOverlay from './common/UpgradeOverlay';
import dayjs from 'dayjs';
import { Item } from '../services/api';
import { Sale } from '../services/salesApi';
import { Expense } from '../models/expenses';
import useFormat from '../hooks/useFormat';
import { dashboardService, ComprehensiveMetrics } from '../services/dashboardService';

import { AppUser } from '../contexts/AuthContext';
import { useAuthReady } from '../hooks/useAuthReady';
import { useRenderLog } from '../hooks/useRenderLog';
import MetricsCard from './MetricsCard';
import { LineChart, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, TooltipProps } from 'recharts';

// Define a simple isEqual function to avoid lodash dependency
function isEqual(objA: any, objB: any): boolean {
  if (objA === objB) return true;
  if (objA === null || objB === null) return false;
  if (typeof objA !== 'object' || typeof objB !== 'object') return objA === objB;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(objA[key], objB[key])) return false;
  }
  
  return true;
}

// Define the props for the ReportsSection component
interface ReportsSectionProps {
  items: Item[];
  sales: Sale[];
  expenses: Expense[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  currentUser: AppUser | null;
}

// Interface for metrics data from the backend
interface MetricsData {
  inventoryMetrics: { totalInventory: number; totalInventoryCost: number; potentialProfit: number; };
  salesMetrics: { totalSales: number; totalSalesRevenue: number; revenueChange: number; };
  expenseMetrics: { totalExpenses: number; expenseChange: number; };
  profitMetrics: { netProfitSold: number; netProfitChange: number; roiSold: number; roiChange: number; };
  dateMetrics: { date: string; sales: number; expenses: number; profit: number; }[];
}

// Main component definition
export const ReportsSection: React.FC<ReportsSectionProps> = function ReportsSection({
  items,
  sales,
  expenses,
  startDate,
  endDate,
  currentUser: propCurrentUser
}) {
  const theme = useTheme();
  const { money, percentFormat } = useFormat();
  const { authReady, currentUser: authCurrentUserFromHook } = useAuthReady();
  
  // Hooks are all at the top
  const currentUser = propCurrentUser ?? authCurrentUserFromHook;
  const accountTier = currentUser?.accountTier || 'Free';
  
  // DEBUG: Log the user's account tier for debugging tier restrictions
  useEffect(() => {
    console.log('🔍 [ReportsSection] User account tier:', accountTier);
    console.log('🔍 [ReportsSection] User custom claims:', currentUser?.customClaims);
    console.log('🔍 [ReportsSection] isFeatureLocked:', {
      isROIPercentageLocked: accountTier?.toLowerCase() === 'free',
      isRealizedProfitExpensesLocked: accountTier?.toLowerCase() === 'free',
      tierComparison: `"${accountTier?.toLowerCase()}" === "free" = ${accountTier?.toLowerCase() === 'free'}`
    });
    
    // Visual alert for debugging
    if (accountTier?.toLowerCase() === 'free') {
      console.log('🚨 FREE TIER DETECTED - ROI and Realized Profit should be LOCKED! 🚨');
    }
  }, [accountTier, currentUser?.customClaims]);

  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [isFetching, setIsFetching] = useState(false); 
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false); // Local state for upgrade banner visibility
  const [showSpinner, setShowSpinner] = useState(false); // UI indicator
  const [metricsLoaded, setMetricsLoaded] = useState(false);

  // Use useMemo for date range to update when props change
  const range = useMemo(() => ({
    start: startDate ? dayjs(startDate).startOf('day').toISOString() : null,
    end: endDate ? dayjs(endDate).endOf('day').toISOString() : null,
  }), [startDate, endDate]);

  useRenderLog('ReportsSection', {
    authReady, isFetching, showSpinner, accountTier,
    itemsCount: items.length, salesCount: sales.length, expensesCount: expenses.length,
    startDate: startDate?.toISOString() ?? 'N/A', endDate: endDate?.toISOString() ?? 'N/A',
  });

  // Track both whether we've fetched and what range was used
  const fetchStateRef = useRef({
    hasFetched: false,
    lastRangeStart: null as string | null,
    lastRangeEnd: null as string | null,
    lastRequestTime: 0, // Track the timestamp of the last request
    pendingRequest: false // Track if there's a request in flight
  });

  const fetchMetricsData = useCallback(async () => {
    // Implement request deduplication
    const now = Date.now();
    const timeSinceLastRequest = now - fetchStateRef.current.lastRequestTime;
    
    // Skip if already fetching or if there was a recent request (within 500ms)
    if (isFetching || fetchStateRef.current.pendingRequest) {
      console.log('[ReportsSection] Fetch skipped: already fetching');
      return;
    }
    
    if (timeSinceLastRequest < 500) {
      console.log(`[ReportsSection] Fetch skipped: too soon after last request (${timeSinceLastRequest}ms)`);
      return;
    }
    
    // Set loading states and update request tracking
    setIsFetching(true);
    setShowSpinner(true);
    fetchStateRef.current.lastRequestTime = now;
    fetchStateRef.current.pendingRequest = true;
    
    console.log('[ReportsSection] Fetching metrics data with range:', { 
      start: range.start, 
      end: range.end,
      requestTime: new Date(now).toISOString()
    });
    
    try {
      const data = await dashboardService.fetchDashboardMetrics(
        range.start ? new Date(range.start) : undefined, 
        range.end ? new Date(range.end) : undefined
      );
      
      // Stringified comparison to avoid reference-based re-renders
      const existingDataString = JSON.stringify(metricsData);
      const newDataString = JSON.stringify(data);
      
      if (existingDataString !== newDataString) {
        console.log('[ReportsSection] Metrics data changed - updating state', {
          oldSalesTotal: metricsData?.salesMetrics?.totalSales || 0,
          newSalesTotal: data?.salesMetrics?.totalSales || 0
        });
        setMetricsData(data as unknown as MetricsData);
        setMetricsLoaded(true);
      } else {
        console.log('[ReportsSection] Metrics data unchanged - skipping update');
      }
      
      // Update fetch state ref with current range
      fetchStateRef.current = {
        hasFetched: true,
        lastRangeStart: range.start,
        lastRangeEnd: range.end,
        lastRequestTime: now,
        pendingRequest: false
      };
      console.log('[ReportsSection] Updated fetchStateRef:', fetchStateRef.current);
    } catch (err: any) {
      console.error('[ReportsSection] Error fetching metrics:', err);
    } finally {
      setIsFetching(false);
      setShowSpinner(false);
      fetchStateRef.current.pendingRequest = false;
    }
  }, [range.start, range.end, metricsData, startDate, endDate]); // Include startDate and endDate to ensure refetch when filters change

  // Ref to track initial mount to prevent double fetching
  const mountRef = useRef(false);
  
  // Single consolidated useEffect for fetching metrics data
  // This replaces multiple fetch effects to prevent duplicate requests
  useEffect(() => {
    if (mountRef.current) {
      // Not the first render, so proceed with normal logic
      // Skip if auth is not ready or already fetching
      if (!authReady || isFetching) {
        console.log('⏳ [ReportsSection] Fetch skipped: auth not ready or already fetching');
        return;
      }
      
      console.log('[ReportsSection] Fetch effect triggered with:', {
        authReady,
        startDate: startDate?.format('YYYY-MM-DD') || 'null',
        endDate: endDate?.format('YYYY-MM-DD') || 'null',
        fetchState: fetchStateRef.current
      });
      
      // Check if we need to fetch based on range changes
      const rangeChanged = 
        fetchStateRef.current.lastRangeStart !== range.start || 
        fetchStateRef.current.lastRangeEnd !== range.end;
        
      // Only fetch if we haven't fetched yet or if the range has changed
      if (fetchStateRef.current.hasFetched && !rangeChanged) {
        console.log('[ReportsSection] Fetch skipped: already fetched with current range');
        return;
      }
      
      console.log('🚀 [ReportsSection] Fetching metrics data...');
      fetchMetricsData();
    } else {
      // First render - mark as mounted but don't fetch yet
      // This prevents the initial double fetch
      mountRef.current = true;
      console.log('[ReportsSection] Initial mount - deferring fetch to avoid duplicate requests');
      
      // Use a small timeout to ensure we only fetch once after initial mount effects settle
      const timerId = setTimeout(() => {
        if (authReady && !isFetching) {
          console.log('[ReportsSection] Executing deferred initial fetch');
          fetchMetricsData();
        }
      }, 100);
      
      return () => clearTimeout(timerId);
    }
  }, [authReady, isFetching, startDate, endDate, range, fetchMetricsData]);

  useEffect(() => {
    console.log('[ReportsSection] Props updated:', { metricsLoaded });
  }, [metricsLoaded]);

  const filteredData = useMemo(() => {
    const filterByDate = (date: string | Date) => {
      const d = dayjs(date);
      const start = startDate ? dayjs(startDate).startOf('day') : null;
      const end = endDate ? dayjs(endDate).endOf('day') : null;
      const isAfterStart = start ? d.isAfter(start) : true;
      const isBeforeEnd = end ? d.isBefore(end) : true;
      return isAfterStart && isBeforeEnd;
    };
    
    return {
      filteredSales: sales.filter(sale => filterByDate(sale.saleDate)),
      filteredExpenses: expenses.filter(expense => filterByDate(expense.expenseDate)),
    };
  }, [sales, expenses, startDate, endDate]);

  const calculatedValues = useMemo(() => {
    const { filteredSales, filteredExpenses } = filteredData;
    const actualSalesProfit = filteredSales.reduce((total, sale) => total + (sale.salePrice - (sale.purchasePrice || 0) - (sale.platformFees || 0) - (sale.shippingPrice || 0)), 0);
    const actualExpensesTotal = filteredExpenses.reduce((total, expense) => total + (expense.amount || 0), 0);
    const kpiRealizedProfitExpenses = actualSalesProfit - actualExpensesTotal;
    return { actualSalesProfit, actualExpensesTotal, kpiRealizedProfitExpenses };
  }, [filteredData]);

  const changeValues = useMemo(() => ({
    changeNetProfit: metricsData?.profitMetrics?.netProfitChange || 0,
    changeSalesIncome: metricsData?.salesMetrics?.revenueChange || 0,
    changeItemSpend: 0, // Placeholder
    changeROIPercentage: metricsData?.profitMetrics?.roiChange || 0,
    changeExpenseSpend: metricsData?.expenseMetrics?.expenseChange || 0,
    changeItemsPurchased: 0, // Placeholder
    changeItemsSold: 0, // Placeholder
    changeRealizedProfitExpenses: 0, // Placeholder
  }), [metricsData]);

  const memoizedMetrics = useMemo(() => {
    return {
      netProfit: metricsData?.profitMetrics?.netProfitSold || 0,
      salesIncome: metricsData?.salesMetrics?.totalSalesRevenue || 0,
      itemSpend: metricsData?.inventoryMetrics?.totalInventoryCost || 0,
      roiPercentage: Number((metricsData?.profitMetrics?.roiSold || 0).toFixed(2)),
      expenseSpend: metricsData?.expenseMetrics?.totalExpenses || 0,
      itemsPurchased: metricsData?.inventoryMetrics?.totalInventory || 0,
      itemsSold: metricsData?.salesMetrics?.totalSales || 0,
      realizedProfitExpenses: (metricsData?.salesMetrics?.totalSalesRevenue || 0) - 
                              (metricsData?.expenseMetrics?.totalExpenses || 0)
    };
  }, [
    metricsData?.profitMetrics?.netProfitSold,
    metricsData?.salesMetrics?.totalSalesRevenue,
    metricsData?.inventoryMetrics?.totalInventoryCost,
    metricsData?.profitMetrics?.roiSold,
    metricsData?.expenseMetrics?.totalExpenses,
    metricsData?.inventoryMetrics?.totalInventory,
    metricsData?.salesMetrics?.totalSales
  ]);

  const kpiValues = useMemo(() => ({
    kpiNetProfit: memoizedMetrics.netProfit,
    kpiSalesIncome: memoizedMetrics.salesIncome,
    kpiItemSpend: memoizedMetrics.itemSpend,
    kpiROIPercentage: memoizedMetrics.roiPercentage,
    kpiExpenseSpend: memoizedMetrics.expenseSpend,
    kpiItemsPurchased: memoizedMetrics.itemsPurchased,
    kpiItemsSold: memoizedMetrics.itemsSold,
    kpiRealizedProfitExpenses: memoizedMetrics.realizedProfitExpenses
  }), [memoizedMetrics]);

  const isFeatureLocked = useMemo(() => ({
    isROIPercentageLocked: accountTier?.toLowerCase() === 'free',
    isItemsSoldLocked: false, // Items Sold should not be locked for any tier
    isRealizedProfitExpensesLocked: accountTier?.toLowerCase() === 'free',
  }), [accountTier]);
  
  const metricsCardProps = useMemo(() => ({
    netProfit: {
      title: <>Net Profit <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Unsold)</Typography></>,
      value: kpiValues.kpiNetProfit,
      change: changeValues.changeNetProfit,
      data: [],
      tooltipText: "Potential profit from current unlisted and listed inventory (Market Price - Purchase Price).",
      useFormatter: true
    },
    salesIncome: {
      title: "Sales Income",
      value: kpiValues.kpiSalesIncome,
      change: changeValues.changeSalesIncome,
      data: [],
      tooltipText: "Total revenue from sales in the selected period.",
      useFormatter: true
    },
    itemSpend: {
      title: <>Item Spend <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>,
      value: kpiValues.kpiItemSpend,
      change: changeValues.changeItemSpend,
      data: [],
      tooltipText: "Total cost of items acquired/purchased by the user within the selected period. (Data pending backend update)",
      useFormatter: true
    },
    roiPercentage: {
      title: <>ROI Percentage <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Sold)</Typography></>,
      value: kpiValues.kpiROIPercentage,
      change: changeValues.changeROIPercentage,
      data: [],
      suffix: "%",
      tooltipText: "Return on Investment for items sold in the selected period.",
      useFormatter: false,
      isLocked: isFeatureLocked.isROIPercentageLocked
    },
    expenseSpend: {
      title: <>Expense Spend <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>,
      value: kpiValues.kpiExpenseSpend,
      change: changeValues.changeExpenseSpend,
      data: [],
      tooltipText: "Total business expenses logged within the selected period.",
      useFormatter: true
    },
    itemsPurchased: {
      title: <>Items Purchased <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>,
      value: kpiValues.kpiItemsPurchased,
      change: changeValues.changeItemsPurchased,
      data: [],
      tooltipText: "Count of new items acquired by the user within the selected period. (Data pending backend update - currently shows total inventory)",
      useFormatter: false
    },
    itemsSold: {
      title: <>Items Sold <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>(Period)</Typography></>,
      value: kpiValues.kpiItemsSold,
      change: changeValues.changeItemsSold,
      data: [],
      tooltipText: "Count of items sold within the selected period.",
      useFormatter: false,
      isLocked: isFeatureLocked.isItemsSoldLocked
    },
    realizedProfitExpenses: {
      title: "Realized Profit - Expenses",
      value: kpiValues.kpiRealizedProfitExpenses,
      change: changeValues.changeRealizedProfitExpenses,
      data: [],
      tooltipText: "(Sales Revenue - COGS - Platform Fees) - General Business Expenses for the selected period.",
      useFormatter: true,
      isLocked: isFeatureLocked.isRealizedProfitExpensesLocked
    }
  }), [kpiValues, changeValues, isFeatureLocked]);
  
  // Memoized tooltip formatter to prevent re-renders
  const tooltipFormatter = useCallback((value: number | string | Array<any> | undefined) => {
    if (typeof value === 'number') {
      return `$${value.toFixed(2)}`;
    }
    return value;
  }, []);
  
  // Create deeply memoized components for all Recharts elements
  const MemoizedLegend = memo(RechartsLegend, (prev, next) => {
    // Use deep comparison for complex objects
    return isEqual(prev, next);
  });
  
  const MemoizedCartesianGrid = memo(CartesianGrid, (prev, next) => {
    return isEqual(prev, next);
  });
  
  const MemoizedXAxis = memo(XAxis, (prev, next) => {
    return isEqual(prev, next);
  });
  
  const MemoizedYAxis = memo(YAxis, (prev, next) => {
    return isEqual(prev, next);
  });
  
  const MemoizedLine = memo(RechartsLine, (prev, next) => {
    // Deep comparison of all props
    return isEqual(prev, next);
  });
  
  // Memoized Line component with props and custom equality check
  const Line = memo(({ dataKey, stroke, name, activeDot }: { dataKey: string; stroke: string; name: string; activeDot?: any }) => {
    return <RechartsLine 
      type="monotone" 
      dataKey={dataKey} 
      stroke={stroke} 
      name={name}
      activeDot={activeDot} 
      isAnimationActive={false} // Disable animation to reduce render spam
      dot={false} // Disable dots to reduce render spam
      strokeWidth={2} // Consistent stroke width
    />;
  }, (prevProps, nextProps) => {
    // Custom equality check to prevent unnecessary re-renders
    return prevProps.dataKey === nextProps.dataKey && 
           prevProps.stroke === nextProps.stroke && 
           prevProps.name === nextProps.name;
  });

  // Memoized chart props with frozen references
  const chartProps = useMemo(() => Object.freeze({
    margin: Object.freeze({ top: 5, right: 30, left: 20, bottom: 5 }),
  }), []);

  // Create a completely custom tooltip solution that bypasses Recharts tooltip components
  // This avoids the problematic TooltipBoundingBox that causes console errors
  const [tooltipData, setTooltipData] = useState<{
    show: boolean;
    x: number;
    y: number;
    payload: any[];
    label: string;
  }>({ show: false, x: 0, y: 0, payload: [], label: '' });
  
  // Stable tooltip styles with frozen reference
  const tooltipStyles = useMemo(() => Object.freeze({
    position: 'absolute' as 'absolute',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    padding: '8px',
    borderRadius: '4px',
    pointerEvents: 'none' as 'none', // Type assertion for TypeScript
    zIndex: 1000,
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
    transition: 'opacity 0.2s',
    opacity: tooltipData.show ? 1 : 0,
    left: `${tooltipData.x}px`,
    top: `${tooltipData.y - 10}px`,
    minWidth: '120px',
  }), [theme.palette.background.paper, theme.palette.divider, tooltipData]);
  
  // Custom tooltip component completely separate from Recharts tooltip system
  const CustomTooltip = memo(() => {
    if (!tooltipData.show || !tooltipData.payload || tooltipData.payload.length === 0) {
      return null;
    }
    
    const textSecondary = theme.palette.text.secondary;
    
    return (
      <div style={tooltipStyles}>
        <Typography variant="body2" color={textSecondary}>
          {tooltipData.label}
        </Typography>
        {tooltipData.payload.map((entry, index) => (
          <Typography key={index} variant="body2" style={{ color: entry.color }}>
            {entry.name}: ${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </Typography>
        ))}
      </div>
    );
  }, (prevProps, nextProps) => true); // Always consider equal to prevent re-renders
  
  // Memoized props for CartesianGrid with frozen references
  const cartesianGridProps = useMemo(() => Object.freeze({
    strokeDasharray: '3 3',
    stroke: theme.palette.divider,
    vertical: true,
    horizontal: true,
  }), [theme.palette.divider]);
  
  // Memoized props for XAxis with frozen references
  const xAxisProps = useMemo(() => Object.freeze({
    dataKey: 'date',
    stroke: theme.palette.text.secondary,
    style: Object.freeze({
      fontSize: '0.75rem',
    }),
    height: 60,
    tickMargin: 10,
  }), [theme.palette.text.secondary]);
  
  // Memoized props for YAxis with frozen references
  const yAxisProps = useMemo(() => Object.freeze({
    stroke: theme.palette.text.secondary,
    style: Object.freeze({
      fontSize: '0.75rem',
    }),
    tickFormatter: (value: number) => `$${value}`,
    width: 80,
    tickMargin: 10,
  }), [theme.palette.text.secondary]);

  const chartData = useMemo(() => {
    console.log('[ReportsSection] Deriving chartData from metricsData');
    // Use dateMetrics which is an array
    if (!metricsData || !metricsData.dateMetrics) {
      return [];
    }
    
    // Create a stable JSON string first to ensure consistent reference
    const stableData = JSON.stringify(metricsData.dateMetrics);
    
    // Parse and transform to ensure stable references
    return JSON.parse(stableData).map((item: any) => ({
      date: item.date || 'Unknown',
      sales: Math.round(item.sales || 0),  // Round to ensure stable values
      expenses: Math.round(item.expenses || 0),
      profit: Math.round(item.profit || 0),
    }));
  }, [metricsData?.dateMetrics]);

  const prevChartDataRef = useRef(chartData);
  useEffect(() => {
    const isEqual = JSON.stringify(prevChartDataRef.current) === JSON.stringify(chartData);
    if (!isEqual) {
      console.log('[ReportsSection] Chart data changed (deep comparison):', { prev: prevChartDataRef.current, current: chartData });
      prevChartDataRef.current = chartData;
    } else {
      console.log('[ReportsSection] Chart data stable (deep comparison), no change detected');
    }
  }, [chartData]);

  // Memoized props for Line components with frozen references
  const lineProps = useMemo(() => Object.freeze({
    sales: Object.freeze({
      type: 'monotone' as const,
      dataKey: 'sales',
      stroke: theme.palette.primary.main,
      activeDot: Object.freeze({ r: 8 }),
      isAnimationActive: false,
      dot: false,
      // Add additional props to stabilize
      strokeWidth: 2,
      name: 'Sales',
      connectNulls: true,
    }),
    profit: Object.freeze({
      type: 'monotone' as const,
      dataKey: 'profit',
      stroke: theme.palette.success.main,
      activeDot: Object.freeze({ r: 8 }),
      isAnimationActive: false,
      dot: false,
      // Add additional props to stabilize
      strokeWidth: 2,
      name: 'Profit',
      connectNulls: true,
    }),
    expenses: Object.freeze({
      type: 'monotone' as const,
      dataKey: 'expenses',
      stroke: theme.palette.error.main,
      activeDot: Object.freeze({ r: 8 }),
      isAnimationActive: false,
      dot: false,
      // Add additional props to stabilize
      strokeWidth: 2,
      name: 'Expenses',
      connectNulls: true,
    })
  }), [theme.palette.primary.main, theme.palette.success.main, theme.palette.error.main]);
  
  // Custom mouse move handler for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartData || chartData.length === 0) return;
    
    // Get chart container dimensions
    const chartContainer = e.currentTarget;
    const rect = chartContainer.getBoundingClientRect();
    
    // Calculate relative position within chart
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate which data point is closest to mouse position
    const chartWidth = rect.width;
    const dataPointWidth = chartWidth / chartData.length;
    const dataIndex = Math.min(
      Math.floor(x / dataPointWidth),
      chartData.length - 1
    );
    
    if (dataIndex >= 0 && dataIndex < chartData.length) {
      const currentPoint = chartData[dataIndex];
      setTooltipData({
        show: true,
        x: x + 20, // Offset to not cover the point
        y: y,
        payload: [
          { name: 'Sales', value: currentPoint.sales, color: theme.palette.primary.main },
          { name: 'Profit', value: currentPoint.profit, color: theme.palette.success.main },
          { name: 'Expenses', value: currentPoint.expenses, color: theme.palette.error.main }
        ],
        label: currentPoint.date
      });
    }
  }, [chartData, theme.palette.primary.main, theme.palette.success.main, theme.palette.error.main]);
  
  const handleMouseLeave = useCallback(() => {
    setTooltipData(prev => ({ ...prev, show: false }));
  }, []);
  
  // Define the props interface for the chart wrapper
  interface ChartWrapperProps {
    chartData: Array<any>;
    chartProps: {
      margin: { top: number; right: number; left: number; bottom: number };
    };
    cartesianGridProps: {
      strokeDasharray: string;
      stroke: string;
      vertical: boolean;
      horizontal: boolean;
    };
    xAxisProps: {
      dataKey: string;
      stroke: string;
      style: { fontSize: string };
      height: number;
      tickMargin: number;
    };
    yAxisProps: {
      stroke: string;
      style: { fontSize: string };
      tickFormatter: (value: number) => string;
      width: number;
      tickMargin: number;
    };
    lineProps: {
      sales: any;
      profit: any;
      expenses: any;
    };
    handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleMouseLeave: () => void;
  }
  
  // Create a deeply memoized chart wrapper component
  const MemoizedChartWrapper = memo((props: ChartWrapperProps) => {
    const { 
      chartData, 
      chartProps, 
      cartesianGridProps, 
      xAxisProps, 
      yAxisProps, 
      lineProps,
      handleMouseMove,
      handleMouseLeave
    } = props;
    console.log('[ReportsSection] MemoizedChartWrapper rendered');
    
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return <Box sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }} />;
    }
    
    // Use a stable key to prevent unnecessary re-renders
    const chartKey = 'metrics-chart';
    
    return (
      <div 
        style={{ position: 'relative', width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <LineChart key={chartKey} data={chartData} margin={chartProps.margin}>
          <MemoizedCartesianGrid {...cartesianGridProps} />
          <MemoizedXAxis {...xAxisProps} />
          <MemoizedYAxis {...yAxisProps} />
          <MemoizedLegend />
          <MemoizedLine {...lineProps.sales} />
          <MemoizedLine {...lineProps.profit} />
          <MemoizedLine {...lineProps.expenses} />
        </LineChart>
        <CustomTooltip />
      </div>
    );
  }, (prevProps, nextProps) => {
    // Deep comparison of all props
    return isEqual(prevProps, nextProps);
  });
  
  // Memoize the chart JSX content itself
  const chartContent = useMemo(() => {
    console.log('[ReportsSection] Chart content memoized');
    // Ensure chartData is an array before checking its length
    if (!Array.isArray(chartData) || chartData.length === 0) {
      // Render an empty placeholder box to avoid Recharts' default "No data available" message
      return <Box sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }} />;
    }
    
    return (
      <MemoizedChartWrapper
        chartData={chartData}
        chartProps={chartProps}
        cartesianGridProps={cartesianGridProps}
        xAxisProps={xAxisProps}
        yAxisProps={yAxisProps}
        lineProps={lineProps}
        handleMouseMove={handleMouseMove}
        handleMouseLeave={handleMouseLeave}
      />
    );
  }, [chartData, chartProps, cartesianGridProps, xAxisProps, yAxisProps, lineProps, handleMouseMove, handleMouseLeave]);

  // This useEffect has been consolidated with the one above
  // to prevent duplicate fetch requests

  // Monitor key dependency changes that might cause fetch loops
  useEffect(() => {
    console.log('[ReportsSection] isFetching changed:', isFetching, 'current fetch status');
  }, [isFetching]);
  
  useEffect(() => {
    console.log('[ReportsSection] Range or user changed:', { 
      range, 
      currentUserUid: currentUser?.uid,
      fetchState: fetchStateRef.current
    });
    
    // Reset fetch state when user changes to force a new fetch
    if (currentUser?.uid) {
      const userChanged = fetchStateRef.current.hasFetched && 
                         !fetchStateRef.current.lastRangeStart && 
                         !fetchStateRef.current.lastRangeEnd;
      if (userChanged) {
        console.log('[ReportsSection] User changed, resetting fetch state');
        fetchStateRef.current.hasFetched = false;
      }
    }
  }, [range, currentUser?.uid]);
  
  // Add ref to track render count and identify potential loops
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current++;
    console.log(`[ReportsSection] Component rendered ${renderCountRef.current} times`);
    
    // Log when chart components render to track optimization progress
    console.log('[ReportsSection] Chart render optimization check - verify reduced render spam');
    
    // Return cleanup function to help with memory management
    return () => {
      console.log('[ReportsSection] Component cleanup');
    };
  }, []);

  // Log detailed calculations only once per render
  useEffect(() => {
    // Log expense details
    filteredData.filteredExpenses.forEach(expense => {
      console.log(`Expense: ${expense.expenseType}, Amount: $${expense.amount}`);
    });
    
    console.log('-------- DETAILED CALCULATION BREAKDOWN --------');
    console.log('Date range:', startDate?.format('MM/DD/YYYY') || 'all', 'to', endDate?.format('MM/DD/YYYY') || 'all');
    console.log('Filtered sales count:', filteredData.filteredSales.length);
    console.log('Filtered expenses count:', filteredData.filteredExpenses.length);
    console.log('TOTAL SALES REVENUE:', filteredData.filteredSales.reduce((t, s) => t + (s.salePrice || 0), 0));
    console.log('COST OF GOODS SOLD:', filteredData.filteredSales.reduce((t, s) => t + (s.purchasePrice || 0), 0));
    console.log('PLATFORM FEES:', filteredData.filteredSales.reduce((t, s) => t + (s.platformFees || 0), 0));
    console.log('SHIPPING COSTS:', filteredData.filteredSales.reduce((t, s) => t + (s.shippingPrice || 0), 0));
    console.log('ACTUAL SALES PROFIT:', calculatedValues.actualSalesProfit);
    console.log('ACTUAL EXPENSES TOTAL:', calculatedValues.actualExpensesTotal);
    console.log('REALIZED PROFIT CALCULATION:', calculatedValues.actualSalesProfit, '-', calculatedValues.actualExpensesTotal, '=', kpiValues.kpiRealizedProfitExpenses);
    console.log('-------- END CALCULATION BREAKDOWN --------');
  }, [filteredData, calculatedValues, kpiValues, startDate, endDate]);

  
  return (
    <Box sx={{ width: '100%', p: 0, m: 0, overflow: 'visible' }}>
      {showSpinner && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
      )}
      {/* --- KPI Metrics Section --- */}
      {!showSpinner && metricsLoaded && metricsData && (
        <>
          {/* Premium Upgrade Banner (conditional, not static) */}
          {showUpgradeBanner && (
            <ClickAwayListener onClickAway={() => setShowUpgradeBanner(false)}>
              <div>
                <UpgradeOverlay text="Upgrade to unlock full analytics and see all your KPI details!" />
              </div>
            </ClickAwayListener>
          )}
          
          {/* KPI Metrics Cards */}
          <Grid container spacing={1.5} sx={{ width: '100%', m: 0, overflowY: 'visible', overflowX: 'visible' }}>
            {Object.entries(metricsCardProps).map(([key, props]) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <div
                  onClick={() => {
                    if ('isLocked' in props && props.isLocked) {
                      setShowUpgradeBanner(true);
                    }
                  }}
                  style={{
                    height: '100%',
                    cursor: ('isLocked' in props && props.isLocked) ? 'pointer' : 'default',
                    filter: (showUpgradeBanner && 'isLocked' in props && props.isLocked) ? 'blur(3px)' : 'none',
                    transition: 'filter 0.3s ease-in-out'
                  }}
                >
                  <MetricsCard {...props} />
                </div>
              </Grid>
            ))}
          </Grid>
          
          {/* Chart Section */}
          <Box sx={{ width: '100%', mb: 2 }}>
            <ResponsiveContainer minHeight={300}>
              {chartContent}
            </ResponsiveContainer>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ReportsSection;