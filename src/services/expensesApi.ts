// src/services/expensesApi.ts
import { Expense, ExpenseSummary, ExpenseFormData } from '../models/expenses';
import { generateRecurringExpenseEntries } from '../utils/recurringExpensesUtils';

export const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Service for interacting with the expenses API
 */
// --- AUTHENTICATION HELPERS ---
async function getAuthToken(): Promise<string> {
  // Try to get the token from the window or context
  if (typeof window !== 'undefined' && (window as any).getAuthToken) {
    const token = await (window as any).getAuthToken();
    if (!token) throw new Error('No auth token found');
    return token;
  }
  throw new Error('No getAuthToken function available on window');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  console.log('➡️ Sending Authorization header:', headers['Authorization']);
  return headers;
}

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
      
      // Build query parameters
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
      
      // Get the auth headers (with logging)
      let headers: Record<string, string> = {};
      try {
        headers = await getAuthHeaders();
      } catch (tokenErr) {
        console.error('❌ Unable to retrieve auth token:', tokenErr);
        throw new Error('Authentication required. Please log in again.');
      }
      console.log('➡️ [getExpenses] Sending headers:', headers);
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        // Only use mock data if we get a 404 (endpoint not found)
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
      throw error; // Rethrow the error instead of always returning mock data
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers
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
      throw error;
    }
  },
  
  /**
   * Create a new expense record.
   * If the expense is recurring, also generates recurring entries
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
      
      // Make the request to create the base expense
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        console.error(`❌ API createExpense failed with status: ${response.status}`);
        
        // If the API is not yet implemented, use mock data for the base expense
        if (response.status === 404) {
          console.warn('⚠️ Expenses endpoint not found, using mock response');
          const mockExpense = {
            id: Math.floor(Math.random() * 1000) + 100,
            ...expenseData,
            expenseDate: expenseData.expenseDate,
            amount: parseFloat(expenseData.amount),
            isRecurring: Boolean(expenseData.isRecurring),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // If this is a recurring expense and we're using mock data,
          // handle recurring entries here
          if (expenseData.isRecurring && expenseData.recurrencePeriod) {
            const recurringEntries = generateRecurringExpenseEntries(mockExpense);
            console.log(`Generated ${recurringEntries.length} recurring entries for mock data`);
            
            // For mock data, we'll just generate the entries and log them,
            // but not actually create them since we're just returning mock data
            console.log('Recurring entries:', recurringEntries);
          }
          
          return mockExpense;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the created expense from the response
      const createdExpense = await response.json();
      console.log(`✅ Expense created successfully:`, createdExpense);
      
      // Handle recurring entries if needed - but only if explicitly requested
      // We're disabling automatic creation of recurring entries to prevent duplicates
      // Instead, we'll rely on the backend or a separate process to generate these
      if (expenseData.isRecurring && expenseData.recurrencePeriod && expenseData.generateRecurringEntries) {
        try {
          // Generate recurring entries
          const recurringEntries = generateRecurringExpenseEntries(createdExpense);
          console.log(`Generated ${recurringEntries.length} recurring entries`);
          
          // Log the recurring entries but don't create them automatically
          // This prevents duplicate expenses from being created
          console.log('Would create recurring entries:', recurringEntries);
          
          // If we need to actually create these entries, we should do it through a separate API endpoint
          // or have the backend handle it automatically
        } catch (err) {
          console.error('Error generating recurring entries:', err);
        }
      }
      
      return createdExpense;
    } catch (error) {
      console.error('💥 Error in createExpense:', error);
      throw error;
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: formData
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
      throw error;
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
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
      throw error;
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
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers
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
      throw error; // Rethrow the error instead of returning mock data
    }
  },

  /**
   * Get expense types
   * @returns Promise<string[]> List of expense types
   */
  getExpenseTypes: async (): Promise<string[]> => {
    try {
      console.log('🔄 Fetching expense types from API...');
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/expenses/types`, {
        method: 'GET',
        credentials: 'include',
        headers
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
      throw error;
    }
  },

  /**
   * Get total expenses with percentage change from previous period
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Promise<{totalExpenses: number, percentageChange: number, expenseCount: number}> Total expenses with percentage change
   */
  getTotalExpenses: async (startDate?: Date, endDate?: Date): Promise<{totalExpenses: number, percentageChange: number, expenseCount: number}> => {
    try {
      console.log('🔄 Fetching total expenses from API...');
      
      // Construct URL with query parameters for date filtering
      let url = `${API_BASE_URL}/expenses/total`;
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
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        console.error(`❌ API getTotalExpenses failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Total expenses endpoint not found, using mock data');
          return { 
            totalExpenses: 408.23, 
            percentageChange: 7.0, 
            expenseCount: 5 
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved total expenses data:`, data);
      return {
        totalExpenses: data.totalExpenses,
        percentageChange: data.percentageChange,
        expenseCount: data.expenseCount
      };
    } catch (error: any) {
      console.error('💥 Error fetching total expenses data:', error);
      throw error;
    }
  },
  
  /**
   * Generate missing recurring expense entries
   * @returns Promise<{ count: number }> Number of entries generated
   */
  generateRecurringExpenses: async (): Promise<{ count: number }> => {
    try {
      console.log('🔄 Generating missing recurring expense entries...');
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch(`${API_BASE_URL}/expenses/generate-recurring`, {
        method: 'POST',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        console.error(`❌ API generateRecurringExpenses failed with status: ${response.status}`);
        
        // If the API is not yet implemented, return mock data
        if (response.status === 404) {
          console.warn('⚠️ Generate recurring expenses endpoint not found, using mock response');
          return { count: 0 };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ Generated ${result.entries?.length || 0} recurring expense entries`);
      return { count: result.entries?.length || 0 };
    } catch (error: any) {
      console.error('💥 Error generating recurring expenses:', error);
      throw error;
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