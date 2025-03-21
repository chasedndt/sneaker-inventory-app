// src/services/expensesApi.ts
import { Expense, ExpenseSummary } from '../models/expenses';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Service for interacting with the expenses API
 */
export const expensesApi = {
  /**
   * Get all expenses
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Promise<Expense[]> List of expenses
   */
  getExpenses: async (startDate?: Date, endDate?: Date): Promise<Expense[]> => {
    try {
      console.log('🔄 Fetching expenses from API...');
      
      // Construct URL with query parameters for date filtering
      let url = `${API_BASE_URL}/expenses`;
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
      
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getExpenses failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Expenses endpoint not found, using mock data');
          return getMockExpenses();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const expenses = await response.json();
      console.log(`✅ Received ${expenses.length} expenses from API`);
      return expenses;
    } catch (error: any) {
      console.error('💥 Error in getExpenses:', error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock expenses data due to error');
      return getMockExpenses();
    }
  },
  
  /**
   * Get a single expense by ID
   * @param id Expense ID
   * @returns Promise<Expense> Expense data
   */
  getExpense: async (id: number): Promise<Expense> => {
    try {
      console.log(`🔄 Fetching expense with ID ${id} from API...`);
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getExpense failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Expense endpoint not found, using mock data');
          const mockExpenses = getMockExpenses();
          const expense = mockExpenses.find(e => e.id === id);
          if (!expense) throw new Error(`Expense with ID ${id} not found`);
          return expense;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const expense = await response.json();
      console.log(`✅ Retrieved expense ${id} details:`, expense);
      return expense;
    } catch (error: any) {
      console.error(`💥 Error fetching expense ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock expense data due to error');
      const mockExpenses = getMockExpenses();
      const expense = mockExpenses.find(e => e.id === id);
      if (!expense) throw new Error(`Expense with ID ${id} not found`);
      return expense;
    }
  },
  
  /**
   * Create a new expense
   * @param expenseData Expense data to create
   * @returns Promise<Expense> Created expense data
   */
  createExpense: async (expenseData: any): Promise<Expense> => {
    try {
      console.log('🔄 Creating new expense...', expenseData);
      
      // Create FormData object for multipart request (for receipt upload)
      const formData = new FormData();
      
      // Extract receipt file if it exists
      let receipt = null;
      if (expenseData.receipt) {
        receipt = expenseData.receipt;
        // Remove receipt from JSON data to prevent it from being stringified
        const { receipt: _, ...dataWithoutReceipt } = expenseData;
        formData.append('data', JSON.stringify(dataWithoutReceipt));
        formData.append('receipt', receipt);
      } else {
        formData.append('data', JSON.stringify(expenseData));
      }
      
      // Make the request
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        // Don't set Content-Type header, it will be set automatically for multipart/form-data
      });
      
      if (!response.ok) {
        console.error(`❌ API createExpense failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Expenses endpoint not found, using mock response');
          return {
            id: Math.floor(Math.random() * 1000) + 100,
            ...expenseData,
            expenseDate: expenseData.expenseDate.toISOString(),
            amount: parseFloat(expenseData.amount),
            isRecurring: Boolean(expenseData.isRecurring),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const expense = await response.json();
      console.log(`✅ Expense created successfully:`, expense);
      return expense;
    } catch (error: any) {
      console.error('💥 Error in createExpense:', error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response due to error');
      return {
        id: Math.floor(Math.random() * 1000) + 100,
        ...expenseData,
        expenseDate: expenseData.expenseDate.toISOString(),
        amount: parseFloat(expenseData.amount),
        isRecurring: Boolean(expenseData.isRecurring),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },
  
  /**
   * Update an existing expense
   * @param id Expense ID
   * @param expenseData Updated expense data
   * @returns Promise<Expense> Updated expense data
   */
  updateExpense: async (id: number, expenseData: any): Promise<Expense> => {
    try {
      console.log(`🔄 Updating expense ${id}...`, expenseData);
      
      // Create FormData object for multipart request (for receipt upload)
      const formData = new FormData();
      
      // Extract receipt file if it exists
      let receipt = null;
      if (expenseData.receipt) {
        receipt = expenseData.receipt;
        // Remove receipt from JSON data to prevent it from being stringified
        const { receipt: _, ...dataWithoutReceipt } = expenseData;
        formData.append('data', JSON.stringify(dataWithoutReceipt));
        formData.append('receipt', receipt);
      } else {
        formData.append('data', JSON.stringify(expenseData));
      }
      
      // Make the request
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
        // Don't set Content-Type header, it will be set automatically for multipart/form-data
      });
      
      if (!response.ok) {
        console.error(`❌ API updateExpense failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Expenses endpoint not found, using mock response');
          return {
            id,
            ...expenseData,
            expenseDate: expenseData.expenseDate.toISOString(),
            amount: parseFloat(expenseData.amount),
            isRecurring: Boolean(expenseData.isRecurring),
            updated_at: new Date().toISOString()
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const expense = await response.json();
      console.log(`✅ Expense ${id} updated successfully:`, expense);
      return expense;
    } catch (error: any) {
      console.error(`💥 Error updating expense ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response due to error');
      return {
        id,
        ...expenseData,
        expenseDate: expenseData.expenseDate.toISOString(),
        amount: parseFloat(expenseData.amount),
        isRecurring: Boolean(expenseData.isRecurring),
        updated_at: new Date().toISOString()
      };
    }
  },
  
  /**
   * Delete an expense
   * @param id Expense ID
   * @returns Promise<{ success: boolean }> Success status
   */
  deleteExpense: async (id: number): Promise<{ success: boolean }> => {
    try {
      console.log(`🔄 Deleting expense ${id}...`);
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API deleteExpense failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Expenses endpoint not found, using mock response');
          return { success: true };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ Expense ${id} deleted successfully`);
      return { success: true };
    } catch (error: any) {
      console.error(`💥 Error deleting expense ${id}:`, error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock response for delete due to error');
      return { success: true };
    }
  },
  
  /**
   * Get expense summary
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Promise<ExpenseSummary> Expense summary data
   */
  getExpenseSummary: async (startDate?: Date, endDate?: Date): Promise<ExpenseSummary> => {
    try {
      console.log('🔄 Fetching expense summary from API...');
      
      // Construct URL with query parameters for date filtering
      let url = `${API_BASE_URL}/expenses/summary`;
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
      
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getExpenseSummary failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Expense summary endpoint not found, using mock data');
          return getMockExpenseSummary();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const summary = await response.json();
      console.log(`✅ Retrieved expense summary:`, summary);
      return summary;
    } catch (error: any) {
      console.error('💥 Error fetching expense summary:', error);
      
      // Return mock data for development
      console.warn('⚠️ Using mock expense summary data due to error');
      return getMockExpenseSummary();
    }
  },
  
  /**
   * Get expense types
   * @returns Promise<string[]> List of expense types
   */
  getExpenseTypes: async (): Promise<string[]> => {
    try {
      console.log('🔄 Fetching expense types from API...');
      const response = await fetch(`${API_BASE_URL}/expenses/types`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ API getExpenseTypes failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return default types
        if (response.status === 404) {
          console.warn('⚠️ Expense types endpoint not found, using default types');
          return getDefaultExpenseTypes();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const types = await response.json();
      console.log(`✅ Retrieved ${types.length} expense types:`, types);
      return types;
    } catch (error: any) {
      console.error('💥 Error fetching expense types:', error);
      
      // Return default types for development
      console.warn('⚠️ Using default expense types due to error');
      return getDefaultExpenseTypes();
    }
  }
};

/**
 * Generate mock expenses data for development
 * @returns Array of mock expense objects
 */
function getMockExpenses(): Expense[] {
  return [
    {
      id: 1,
      expenseType: 'Shipping',
      amount: 25.99,
      currency: '$',
      expenseDate: '2023-02-15T08:30:00.000Z',
      vendor: 'USPS',
      notes: 'Shipping for Nike Air Force 1 to customer',
      isRecurring: false,
      created_at: '2023-02-15T08:35:00.000Z',
      updated_at: '2023-02-15T08:35:00.000Z'
    },
    {
      id: 2,
      expenseType: 'Packaging',
      amount: 45.50,
      currency: '$',
      expenseDate: '2023-02-10T14:45:00.000Z',
      vendor: 'Uline',
      notes: 'Shoe boxes and bubble wrap',
      isRecurring: false,
      created_at: '2023-02-10T15:00:00.000Z',
      updated_at: '2023-02-10T15:00:00.000Z'
    },
    {
      id: 3,
      expenseType: 'Platform Fees',
      amount: 120.75,
      currency: '$',
      expenseDate: '2023-03-01T10:15:00.000Z',
      vendor: 'StockX',
      notes: 'Monthly seller fees',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      created_at: '2023-03-01T10:20:00.000Z',
      updated_at: '2023-03-01T10:20:00.000Z'
    },
    {
      id: 4,
      expenseType: 'Storage',
      amount: 200.00,
      currency: '$',
      expenseDate: '2023-03-01T09:00:00.000Z',
      vendor: 'StorageMax',
      notes: 'Monthly storage unit rent',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      created_at: '2023-03-01T09:05:00.000Z',
      updated_at: '2023-03-01T09:05:00.000Z'
    },
    {
      id: 5,
      expenseType: 'Software',
      amount: 15.99,
      currency: '$',
      expenseDate: '2023-03-05T16:20:00.000Z',
      vendor: 'Adobe',
      notes: 'Photoshop subscription for product photos',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      created_at: '2023-03-05T16:25:00.000Z',
      updated_at: '2023-03-05T16:25:00.000Z'
    }
  ];
}

/**
 * Generate mock expense summary for development
 * @returns Mock expense summary object
 */
function getMockExpenseSummary(): ExpenseSummary {
  return {
    totalAmount: 408.23,
    expenseCount: 5,
    expenseByType: {
      'Shipping': 25.99,
      'Packaging': 45.50,
      'Platform Fees': 120.75,
      'Storage': 200.00,
      'Software': 15.99
    },
    monthOverMonthChange: 12.5
  };
}

/**
 * Get default expense types
 * @returns Array of default expense type strings
 */
function getDefaultExpenseTypes(): string[] {
  return [
    'Shipping',
    'Packaging',
    'Platform Fees',
    'Storage',
    'Supplies',
    'Software',
    'Marketing',
    'Travel',
    'Utilities',
    'Rent',
    'Insurance',
    'Taxes',
    'Other'
  ];
}

export default expensesApi;