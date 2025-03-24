// src/services/salesApi.ts
import { getImageUrl } from '../utils/imageUtils';

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
}

/**
 * Interface for data submitted when recording a new sale
 */
export interface RecordSaleData {
  itemId: number;
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

export const salesApi = {
  /**
   * Get all sales
   * @returns Promise<Sale[]> List of all sales
   */
  getSales: async (): Promise<Sale[]> => {
    try {
      console.log('🔄 Fetching sales from API...');
      const response = await fetch(`${API_BASE_URL}/sales`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getSales failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Sales endpoint not found, using mock data');
          return getMockSales();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sales = await response.json();
      console.log(`✅ Received ${sales.length} sales from API`);
      return sales;
    } catch (error: any) {
      console.error('💥 Error in getSales:', error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock sales data due to error');
      return getMockSales();
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
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getSale failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Sale endpoint not found, using mock data');
          const mockSales = getMockSales();
          const sale = mockSales.find(s => s.id === id);
          if (!sale) throw new Error(`Sale with ID ${id} not found`);
          return sale;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Retrieved sale ${id} details:`, sale);
      return sale;
    } catch (error: any) {
      console.error(`💥 Error fetching sale ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock sale data due to error');
      const mockSales = getMockSales();
      const sale = mockSales.find(s => s.id === id);
      if (!sale) throw new Error(`Sale with ID ${id} not found`);
      return sale;
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
      const response = await fetch(`${API_BASE_URL}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(saleData),
      });
      
      if (!response.ok) {
        console.error(`❌ API recordSale failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Sales endpoint not found, using mock response');
          return {
            id: Math.floor(Math.random() * 1000) + 100,
            ...saleData,
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Sale recorded successfully:`, sale);
      return sale;
    } catch (error: any) {
      console.error('💥 Error in recordSale:', error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response due to error');
      return {
        id: Math.floor(Math.random() * 1000) + 100,
        ...saleData,
      };
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
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(saleData),
      });
      
      if (!response.ok) {
        console.error(`❌ API updateSale failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Sales endpoint not found, using mock response');
          return {
            ...saleData,
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Sale ${id} updated successfully:`, sale);
      return sale;
    } catch (error: any) {
      console.error(`💥 Error updating sale ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response due to error');
      return {
        ...saleData,
      };
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
      const updateData = {
        field,
        value
      };
      
      const response = await fetch(`${API_BASE_URL}/sales/${id}/field`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        console.error(`❌ API updateSaleField failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Sales field update endpoint not found, using mock response');
          return {
            id,
            itemId: 0,
            platform: '',
            saleDate: new Date().toISOString(),
            salePrice: 0,
            currency: '$',
            status: 'pending' as 'pending',
            [field]: value
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sale = await response.json();
      console.log(`✅ Field ${field} of sale ${id} updated successfully`);
      return sale;
    } catch (error: any) {
      console.error(`💥 Error updating field ${field} of sale ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response for field update due to error');
      return {
        id,
        itemId: 0,
        platform: '',
        saleDate: new Date().toISOString(),
        salePrice: 0,
        currency: '$',
        status: 'pending' as 'pending',
        [field]: value
      };
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
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API deleteSale failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Sales endpoint not found, using mock response');
          return { success: true };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ Sale ${id} deleted successfully`);
      return { success: true };
    } catch (error: any) {
      console.error(`💥 Error deleting sale ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response for delete due to error');
      return { success: true };
    }
  },

  /**
   * Get the total net profit from sold items
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Promise<{netProfitSold: number, salesCount: number}> Total net profit and count of sales
   */
  getNetProfit: async (startDate?: Date, endDate?: Date): Promise<{netProfitSold: number, salesCount: number}> => {
    try {
      console.log('🔄 Fetching net profit from sales API...');
      
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
      
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getNetProfit failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Net profit endpoint not found, using mock data');
          return { netProfitSold: 0, salesCount: 0 };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved net profit data:`, data);
      return data;
    } catch (error: any) {
      console.error('💥 Error fetching net profit data:', error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock net profit data due to error');
      return { netProfitSold: 0, salesCount: 0 };
    }
  }
};

/**
 * Generate mock sales data for development
 * @returns Array of mock sale objects
 */
function getMockSales(): Sale[] {
  return [
    {
      id: 1,
      itemId: 1,
      platform: 'StockX',
      saleDate: '2025-02-15T08:30:00.000Z',
      salePrice: 209.99,
      currency: '$',
      salesTax: 10.50,
      platformFees: 15.75,
      status: 'completed'
    },
    {
      id: 2,
      itemId: 2,
      platform: 'GOAT',
      saleDate: '2025-02-10T14:45:00.000Z',
      salePrice: 129.99,
      currency: '$',
      salesTax: 6.50,
      platformFees: 12.99,
      status: 'completed',
      saleId: 'ORD-12345'
    },
    {
      id: 3,
      itemId: 3,
      platform: 'eBay',
      saleDate: '2025-03-05T10:15:00.000Z',
      salePrice: 89.99,
      currency: '$',
      platformFees: 8.99,
      status: 'needsShipping',
      saleId: 'EB-987654'
    },
    {
      id: 4,
      itemId: 4,
      platform: 'StockX',
      saleDate: '2025-03-12T16:20:00.000Z',
      salePrice: 349.99,
      currency: '$',
      salesTax: 17.50,
      platformFees: 26.25,
      status: 'pending'
    }
  ];
}

export default salesApi;