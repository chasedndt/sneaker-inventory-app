// src/services/expensesApi.ts
import { Expense, ExpenseSummary, ExpenseFormData, ExpenseType } from '../models/expenses';
import { generateRecurringExpenseEntries } from '../utils/recurringExpensesUtils';
import { getApiAuthToken } from './api'; // Adjusted path assuming api.ts is in the same directory

export const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Service for interacting with the expenses API
 */

// Track the last API response for receipts to aid debugging
let lastReceiptResponse: Response | null = null;
// --- AUTHENTICATION HELPERS ---
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getApiAuthToken(); // Use imported getApiAuthToken
  if (!token) {
    // This case should ideally be handled by getApiAuthToken itself by throwing an error
    // or by the calling function checking for a null token if getApiAuthToken can return null.
    // For now, assume getApiAuthToken throws if no token is available or returns a string.
    console.error('🔴 Failed to get auth token in getAuthHeaders.');
    throw new Error('Authentication token is not available.');
  }
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  // console.log('➡️ Sending Authorization header:', headers['Authorization']); // Optional: keep for debugging if needed
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
  }, // End of getExpense

  /**
   * Get all expense types
   * @returns Promise<ExpenseType[]> List of expense types
   */
  getExpenseTypes: async (): Promise<ExpenseType[]> => {
    try {
      console.log('🔄 Fetching expense types from API...');
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/expenses/types`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        console.warn(`⚠️ Expense types endpoint responded with ${response.status}. Falling back to default types.`);
        return getDefaultExpenseTypes();
      }

      const types = await response.json();
      // Ensure types is an array and not empty before returning
      if (!Array.isArray(types) || types.length === 0) { 
        console.warn('⚠️ Expense types endpoint returned empty or invalid data (not an array or empty array). Falling back to default types.');
        return getDefaultExpenseTypes();
      }
      
      console.log(`✅ Received ${types.length} expense types from API`);
      return types;
    } catch (error: any) {
      console.error('💥 Error in getExpenseTypes, falling back to default types:', error);
      return getDefaultExpenseTypes();
    }
  }, // End of getExpenseTypes
  
  // Track processed submission IDs to prevent duplicate submissions
  _processedSubmissionIds: new Set<string>(),
  
  /**
   * Get a direct URL for viewing a receipt
   * @param expenseId The expense ID
   * @param filename The receipt filename
   * @returns Promise<string> Direct URL for accessing the receipt
   */
  getReceiptUrl: async (expenseId: number, filename: string): Promise<string> => {
    try {
      console.log(`🔄 Getting receipt URL for expense ${expenseId}, filename ${filename}...`);
      const headers = await getAuthHeaders();
      
      // Make a request to a dedicated endpoint for receipt access
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/receipt-url`, {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      // Store last response for debugging
      lastReceiptResponse = response;
      
      if (!response.ok) {
        console.error(`❌ getReceiptUrl failed with status: ${response.status}`);
        
        // If the endpoint doesn't exist, construct a URL manually
        if (response.status === 404) {
          console.warn('⚠️ Receipt URL endpoint not found, constructing URL manually');
          
          // Need to get the user ID for the correct path
          let userId = '';
          try {
            // Get user ID from the auth token if available
            const authHeader = headers['Authorization'] || '';
            const token = authHeader.replace('Bearer ', '');
            // Extract user ID from the token or context if possible
            if (typeof window !== 'undefined' && (window as any).getCurrentUserId) {
              userId = (window as any).getCurrentUserId();
            }
            
            // If we have a userId, use the correct path structure
            if (userId) {
              return `${API_BASE_URL}/uploads/${userId}/receipts/${filename}?token=${token}`;
            } else {
              // Fallback - try using the old path structure but this might not work
              return `${API_BASE_URL}/uploads/receipts/${filename}?token=${token}`;
            }
          } catch (err) {
            console.error('Error getting user ID for receipt path:', err);
            // Fallback to old structure
            const token = headers['Authorization']?.replace('Bearer ', '') || '';
            return `${API_BASE_URL}/uploads/receipts/${filename}?token=${token}`;
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Receipt URL retrieved successfully:', data);
      return data.url;
    } catch (error) {
      console.error('💥 Error getting receipt URL:', error);
      throw error;
    }
  },
  
  /**
   * Check if a receipt file exists and is accessible
   * @param url The URL to check
   * @returns Promise<{exists: boolean, contentType?: string}> Whether the file exists and is accessible
   */
  checkReceiptExists: async (url: string | null | undefined): Promise<{exists: boolean, contentType?: string}> => {
    if (!url) {
      console.log('⚠️ No URL provided to checkReceiptExists');
      return { exists: false };
    }
    
    try {
      console.log(`🔄 Checking if receipt exists at: ${url}`);
      const headers = await getAuthHeaders();
      
      // Make a HEAD request to check if the file exists
      const response = await fetch(url, {
        method: 'HEAD',
        credentials: 'include',
        headers
      });
      
      const exists = response.ok;
      const contentType = response.headers.get('Content-Type');
      console.log(`${exists ? '✅' : '❌'} Receipt exists: ${exists}${contentType ? `, type: ${contentType}` : ''}`);
      
      // Log additional debug info if the receipt doesn't exist
      if (!exists) {
        console.log(`🔍 Debug info for failed receipt access:`);
        console.log(`- Status: ${response.status} ${response.statusText}`);
        console.log(`- URL attempted: ${url}`);
        console.log(`- Headers sent:`, headers);
        
        // Try alternate paths if the receipt wasn't found
        if (url.includes('/receipts/')) {
          // If URL contains userId, try without receipts subfolder
          const matchUserId = url.match(/\/uploads\/([^\/]+)\/receipts\//); 
          if (matchUserId && matchUserId[1]) {
            const userId = matchUserId[1];
            const altUrl = url.replace(`/uploads/${userId}/receipts/`, `/uploads/${userId}/`);
            console.log(`🔄 Trying alternate path without receipts subfolder: ${altUrl}`);
            const altResponse = await fetch(altUrl, {
              method: 'HEAD',
              credentials: 'include',
              headers
            });
            console.log(`${altResponse.ok ? '✅' : '❌'} Alternate path exists: ${altResponse.ok}`);
          }
        }
      }
      
      return { exists, contentType: contentType || undefined };
    } catch (error) {
      console.error('💥 Error checking if receipt exists:', error);
      console.error('💥 Error checking receipt existence:', error);
      return { exists: false };
    }
  },
  
  /**
   * Get debug information about the API and receipt handling
   * @returns Object with debug information
   */
  getReceiptDebugInfo: () => {
    return {
      apiBaseUrl: API_BASE_URL,
      lastReceiptResponse: lastReceiptResponse ? {
        status: lastReceiptResponse.status,
        statusText: lastReceiptResponse.statusText,
        headers: Object.fromEntries(lastReceiptResponse.headers.entries()),
        url: lastReceiptResponse.url
      } : null
    };
  },
  
  /**
   * Create a new expense record.
   * If the expense is recurring, also generates recurring entries
   * @param expenseData Expense data to create
   * @returns Promise<Expense> Created expense data
   */
  createExpense: async (expenseData: any): Promise<Expense> => {
    try {
      // Check for duplicate submission using submissionId
      if (expenseData.submissionId) {
        // If this submission ID has already been processed, return the cached response
        if (expensesApi._processedSubmissionIds.has(expenseData.submissionId)) {
          console.warn(`⚠️ Duplicate submission detected with ID: ${expenseData.submissionId}. Ignoring.`);
          throw new Error('This expense has already been submitted. Please refresh the page to see your expenses.');
        }
        
        // Add this submission ID to the processed set
        expensesApi._processedSubmissionIds.add(expenseData.submissionId);
        console.log(`🔢 Processing new submission ID: ${expenseData.submissionId}`);
      }
      
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
      // Check for duplicate submission using submissionId
      if (expenseData.submissionId) {
        // If this submission ID has already been processed, return the cached response
        if (expensesApi._processedSubmissionIds.has(expenseData.submissionId)) {
          console.warn(`⚠️ Duplicate update submission detected with ID: ${expenseData.submissionId}. Ignoring.`);
          throw new Error('This expense update has already been submitted. Please refresh the page to see your expenses.');
        }
        
        // Add this submission ID to the processed set
        expensesApi._processedSubmissionIds.add(expenseData.submissionId);
        console.log(`🔢 Processing update submission ID: ${expenseData.submissionId}`);
      }
      
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
      // Optionally, return mock summary or rethrow
      // For now, rethrowing to make failure explicit
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
 * @returns Array of default ExpenseType objects
 */
function getDefaultExpenseTypes(): ExpenseType[] {
  console.log('🔄 Providing default expense types');
  return [
    { id: 'shipping', name: 'Shipping' },
    { id: 'packaging', name: 'Packaging' },
    { id: 'platform_fees', name: 'Platform Fees' },
    { id: 'storage', name: 'Storage' },
    { id: 'supplies', name: 'Supplies' },
    { id: 'software', name: 'Software' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'travel', name: 'Travel' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'rent', name: 'Rent' },
    { id: 'insurance', name: 'Insurance' },
    { id: 'taxes', name: 'Taxes' },
    { id: 'other', name: 'Other' },
  ];
}

export default expensesApi;