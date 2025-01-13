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
 * 
 * @example
 * try {
 *   const dashboardData = await fetchDashboardData({
 *     startDate: new Date('2024-01-01'),
 *     endDate: new Date('2024-12-31')
 *   });
 *   console.log(dashboardData.portfolioValue);
 * } catch (error) {
 *   console.error('Failed to fetch dashboard data:', error);
 * }
 */
export const fetchDashboardData = async (
  options?: { startDate?: Date; endDate?: Date }
): Promise<DashboardData> => {
  try {
    // TODO: Implement actual API call
    const response = await fetch('/api/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add query parameters if dates are provided
      ...(options && {
        body: JSON.stringify(options)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as DashboardData;

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
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
  