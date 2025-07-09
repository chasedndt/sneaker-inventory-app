// src/services/salesApi.ts
import { getImageUrl } from '../utils/imageUtils';
import { getApiAuthToken } from './api'; // Import the new helper

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Interface for Sale objects received from or sent to the API
 */
export interface Sale {
  id: number;
  itemId: number;
  platform: string;
  saleDate: string;
  salePrice: number;
  currency: string;
  salesTax?: number;
  platformFees?: number;
  status: 'pending' | 'needsShipping' | 'completed';
  saleId?: string;
  profit?: number;
  purchasePrice?: number;
  shippingPrice?: number;
}

/**
 * Enhanced interface for net profit response that includes expense data
 */
export interface NetProfitResponse {
  netProfitSold: number;
  salesCount: number;
  grossProfit: number;
  totalExpenses: number;
  totalSalesRevenue: number;
  totalCostsOfGoods: number;
  avgProfitPerSale: number;
  previousPeriodNetProfit: number;
  netProfitChange: number;
}

/**
 * Interface for data submitted when recording a new sale
 */
export interface RecordSaleData {
  itemId: number | string; // Support both for Firebase compatibility
  platform: string;
  saleDate: string;
  salePrice: number;
  currency: string;
  salesTax?: number;
  platformFees?: number;
  status: 'pending' | 'needsShipping' | 'completed';
  saleId?: string;
}

/**
 * Interface for data submitted when updating an existing sale
 */
export interface UpdateSaleData extends RecordSaleData {
  id: number;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getApiAuthToken(); // Use the imported helper
  if (!token) { // Add a check here since getApiAuthToken can resolve to null
    throw new Error('Authentication required: No token available.');
  }
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  console.log('➡️ Sending Authorization header:', headers['Authorization']);
  return headers;
};

export const salesApi = {
  /**
   * Get all sales
   * @returns Promise<Sale[]> List of all sales
   */
  getSales: async (): Promise<Sale[]> => {
    try {
      console.log('🔄 Fetching sales from API...');
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sales`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getSales failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sales = await response.json();
      console.log(`✅ Received ${sales.length} sales from API`);

      // Calculate profit for each sale if it's not already present
      const salesWithProfit = sales.map((sale: Sale) => {
        if (sale.profit === undefined) {
          // Calculate profit based on available data
          const purchasePrice = sale.purchasePrice || 0;
          const salesTax = sale.salesTax || 0;
          const platformFees = sale.platformFees || 0;
          const shippingCost = sale.shippingPrice || 0;
          
          // Calculate and add profit to the sale object
          const profit = sale.salePrice - purchasePrice - salesTax - platformFees - shippingCost;
          return {
            ...sale,
            profit
          };
        }
        return sale;
      });
      
      return salesWithProfit;
    } catch (error: any) {
      console.error('💥 Error in getSales:', error);
      throw error;
    }
  },
  
  /**
   * Get a single sale by ID
   * @param id Sale ID
   * @returns Promise<Sale> Sale data
   */
  getSale: async (id: number): Promise<Sale> => {
    try {
      console.log(`🔄 Fetching sale with ID ${id} from API...`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getSale failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Retrieved sale ${id} details:`, sale);
      
      // Add profit calculation if not present
      if (sale.profit === undefined) {
        const purchasePrice = sale.purchasePrice || 0;
        const salesTax = sale.salesTax || 0;
        const platformFees = sale.platformFees || 0;
        const shippingCost = sale.shippingPrice || 0;
        
        // Calculate profit
        sale.profit = sale.salePrice - purchasePrice - salesTax - platformFees - shippingCost;
      }
      
      return sale;
    } catch (error: any) {
      console.error(`💥 Error fetching sale ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Record a new sale
   * @param saleData Sale data to record
   * @returns Promise<Sale> Recorded sale data
   */
  recordSale: async (saleData: RecordSaleData): Promise<Sale> => {
    try {
      console.log('🔄 Recording new sale...', saleData);
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch(`${API_BASE_URL}/sales`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(saleData),
      });
      
      if (!response.ok) {
        console.error(`❌ API recordSale failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Sale recorded successfully:`, sale);
      return sale;
    } catch (error: any) {
      console.error('💥 Error in recordSale:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing sale
   * @param id Sale ID
   * @param saleData Updated sale data
   * @returns Promise<Sale> Updated sale data
   */
  updateSale: async (id: number, saleData: UpdateSaleData): Promise<Sale> => {
    try {
      console.log(`🔄 Updating sale ${id}...`, saleData);
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(saleData),
      });
      
      if (!response.ok) {
        console.error(`❌ API updateSale failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Sale ${id} updated successfully:`, sale);
      return sale;
    } catch (error: any) {
      console.error(`💥 Error updating sale ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Update a single field of a sale
   * @param id Sale ID
   * @param field Field to update
   * @param value New value
   * @returns Promise<Sale> Updated sale data
   */
  updateSaleField: async (id: number, field: string, value: any): Promise<Sale> => {
    try {
      console.log(`🔄 Updating field ${field} of sale ${id} to ${value}...`);
      
      // Prepare the update data
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const updateData = {
        field,
        value
      };
      
      const response = await fetch(`${API_BASE_URL}/sales/${id}/field`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        console.error(`❌ API updateSaleField failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Field ${field} of sale ${id} updated successfully`);
      return sale;
    } catch (error: any) {
      console.error(`💥 Error updating field ${field} of sale ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a sale
   * @param id Sale ID
   * @returns Promise<{ success: boolean }> Success status
   */
  deleteSale: async (id: number): Promise<{ success: boolean }> => {
    try {
      console.log(`🔄 Deleting sale ${id}...`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API deleteSale failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ Sale ${id} deleted successfully`);
      return { success: true };
    } catch (error: any) {
      console.error(`💥 Error deleting sale ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get the total net profit from sold items with proper expense accounting
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Promise<NetProfitResponse> Complete profit metrics including expenses
   */
  getNetProfit: async (startDate?: Date, endDate?: Date): Promise<NetProfitResponse> => {
    try {
      console.log('🔄 Fetching net profit with expenses from sales API...');
      
      // Construct URL with query parameters for date filtering
      let url = `${API_BASE_URL}/sales/net-profit`;
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('start_date', startDate.toISOString());
      }
      
      if (endDate) {
        params.append('end_date', endDate.toISOString());
      }
      
      // Append query parameters if any exist
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log('🔍 Making API request to:', url);
      
      const headers = await getAuthHeaders();
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getNetProfit failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved enhanced net profit data:`, data);
      return data;
    } catch (error: any) {
      console.error('💥 Error fetching net profit data:', error);
      throw error;
    }
  }
};

export default salesApi;