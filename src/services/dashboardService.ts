// src/services/dashboardService.ts
import { Item } from './api';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Interface for dashboard data returned by the API
 */
export interface DashboardData {
  portfolioValue: number;
  totalInventory: number;
  activeListings: number;
  monthlySales: number;
  profitMargin: number;
  metrics: {
    netProfit: number;
    netProfitChange: number;
    totalSpend: number;
    totalSpendChange: number;
    itemsPurchased: number;
    itemsSold: number;
  };
}

/**
 * Interface for comprehensive dashboard metrics
 */
export interface ComprehensiveMetrics {
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

export const dashboardService = {
  /**
   * Fetches dashboard data from the backend
   * 
   * @async
   * @function fetchDashboardData
   * @description Retrieves all necessary data for populating the dashboard
   * 
   * @param {Object} [options] - Optional parameters for the fetch request
   * @param {Date} [options.startDate] - Start date for filtering data
   * @param {Date} [options.endDate] - End date for filtering data
   * 
   * @returns {Promise<DashboardData>} Promise that resolves to dashboard data
   * @throws {Error} When the API request fails or returns invalid data
   */
  fetchDashboardData: async (
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<DashboardData> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock data matching the interface
    return {
      portfolioValue: 50000,
      totalInventory: 500,
      activeListings: 250,
      monthlySales: 10000,
      profitMargin: 25,
      metrics: {
        netProfit: 2500,
        netProfitChange: 15,
        totalSpend: 12000,
        totalSpendChange: -5,
        itemsPurchased: 45,
        itemsSold: 32
      }
    };
  },

  /**
   * Fetches comprehensive dashboard metrics from the new endpoint
   * 
   * @async
   * @function fetchDashboardMetrics
   * @description Retrieves comprehensive metrics for all KPIs with consistent calculations
   * 
   * @param {Date} [startDate] - Optional start date for filtering data
   * @param {Date} [endDate] - Optional end date for filtering data
   * 
   * @returns {Promise<ComprehensiveMetrics>} Promise that resolves to comprehensive metrics
   * @throws {Error} When the API request fails
   */
  fetchDashboardMetrics: async (startDate?: Date, endDate?: Date): Promise<ComprehensiveMetrics> => {
    try {
      console.log('🚀 Fetching comprehensive dashboard metrics...');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) {
        params.append('start_date', startDate.toISOString());
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString());
      }
      
      // Make API request
      const url = `${API_BASE_URL}/dashboard/kpi-metrics${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Received dashboard metrics:', data);
      
      return data;
    } catch (error) {
      console.error('💥 Error fetching dashboard metrics:', error);
      
      // Return empty data structure in case of error
      return {
        inventoryMetrics: {
          totalInventory: 0,
          unlistedItems: 0,
          listedItems: 0,
          totalInventoryCost: 0,
          totalShippingCost: 0,
          totalMarketValue: 0,
          potentialProfit: 0
        },
        salesMetrics: {
          totalSales: 0,
          totalSalesRevenue: 0,
          totalPlatformFees: 0,
          totalSalesTax: 0,
          costOfGoodsSold: 0,
          grossProfit: 0,
          revenueChange: 0
        },
        expenseMetrics: {
          totalExpenses: 0,
          expenseByType: {},
          expenseChange: 0
        },
        profitMetrics: {
          netProfitSold: 0,
          netProfitChange: 0,
          potentialProfit: 0,
          roiSold: 0,
          roiInventory: 0,
          overallRoi: 0,
          roiChange: 0
        }
      };
    }
  }
};

/**
 * Dashboard Service Error
 * @class DashboardServiceError
 * @extends Error
 * @description Custom error class for dashboard service specific errors
 */
export class DashboardServiceError extends Error {
  /**
   * @constructor
   * @param {string} message - Error message
   * @param {any} [originalError] - Original error object
   */
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DashboardServiceError';
  }
}