/**
 * Dashboard Data Interface
 * @interface DashboardData
 * @description Defines the structure of data required for the dashboard
 */
export interface DashboardData {
  /**
   * Total value of portfolio in USD
   * @type {number}
   */
  portfolioValue: number;

  /**
   * Total number of items in inventory
   * @type {number}
   */
  totalInventory: number;

  /**
   * Number of active listings across all platforms
   * @type {number}
   */
  activeListings: number;

  /**
   * Total sales for the current month in USD
   * @type {number}
   */
  monthlySales: number;

  /**
   * Current profit margin as a percentage
   * @type {number}
   */
  profitMargin: number;

  /**
   * Portfolio metrics
   * @type {Object}
   */
  metrics: {
    /**
     * Net profit in USD
     * @type {number}
     */
    netProfit: number;

    /**
     * Percentage change in net profit
     * @type {number}
     */
    netProfitChange: number;

    /**
     * Total amount spent in USD
     * @type {number}
     */
    totalSpend: number;

    /**
     * Percentage change in total spend
     * @type {number}
     */
    totalSpendChange: number;

    /**
     * Number of items purchased
     * @type {number}
     */
    itemsPurchased: number;

    /**
     * Number of items sold
     * @type {number}
     */
    itemsSold: number;
  };
}

/**
 * Fetches dashboard data from the backend
 * 
 * @async
 * @function fetchDashboardData
 * @description Retrieves all necessary data for populating the dashboard including
 * portfolio value, inventory counts, sales metrics, and performance indicators
 * 
 * @param {Object} [options] - Optional parameters for the fetch request
 * @param {Date} [options.startDate] - Start date for filtering data
 * @param {Date} [options.endDate] - End date for filtering data
 * 
 * @returns {Promise<DashboardData>} Promise that resolves to dashboard data
 * @throws {Error} When the API request fails or returns invalid data
 */
export const fetchDashboardData = async (
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
