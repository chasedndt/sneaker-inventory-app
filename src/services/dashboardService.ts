// src/services/dashboardService.ts
import { useState, useEffect, useCallback } from 'react';
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
    try {
      console.log('🚀 Fetching real dashboard data...');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (options?.startDate) {
        params.append('start_date', options.startDate.toISOString());
      }
      if (options?.endDate) {
        params.append('end_date', options.endDate.toISOString());
      }
      
      // Make the API request
      const response = await fetch(`${API_BASE_URL}/dashboard/kpi-metrics${params.toString() ? `?${params.toString()}` : ''}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const comprehensiveData = await response.json();
      
      // Transform comprehensive metrics into the DashboardData format
      const dashboardData: DashboardData = {
        portfolioValue: comprehensiveData.inventoryMetrics.totalMarketValue,
        totalInventory: comprehensiveData.inventoryMetrics.totalInventory,
        activeListings: comprehensiveData.inventoryMetrics.listedItems,
        monthlySales: comprehensiveData.salesMetrics.totalSalesRevenue,
        profitMargin: comprehensiveData.profitMetrics.overallRoi,
        metrics: {
          netProfit: comprehensiveData.profitMetrics.netProfitSold,
          netProfitChange: comprehensiveData.profitMetrics.netProfitChange,
          totalSpend: comprehensiveData.inventoryMetrics.totalInventoryCost + 
                      comprehensiveData.expenseMetrics.totalExpenses,
          totalSpendChange: comprehensiveData.expenseMetrics.expenseChange,
          itemsPurchased: comprehensiveData.inventoryMetrics.totalInventory,
          itemsSold: comprehensiveData.salesMetrics.totalSales
        }
      };
      
      return dashboardData;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // If API fails, throw the error for proper handling
      throw error;
    }
  },

  /**
   * Fetches comprehensive dashboard metrics from the API endpoint
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
      console.log(`Making request to: ${url}`);
      
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
      
      // If the API fails, throw error for proper handling
      throw error;
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