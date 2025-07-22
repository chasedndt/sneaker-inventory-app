// src/models/expenses.ts
export interface Expense {
    id: string | number;
    expenseType: string;
    amount: number;
    currency: string;
    expenseDate: string;
    vendor: string;
    notes: string;
    receiptFilename?: string;
    isRecurring: boolean;
    recurrencePeriod?: string;
    created_at?: string;
    updated_at?: string;
    // Backend currency conversion fields (added when display_currency is requested)
    convertedAmount?: number;    // Amount converted to display currency by backend
    originalAmount?: number;     // Original amount for reference
    originalCurrency?: string;   // Original currency for reference
    displayCurrency?: string;    // Display currency used for conversion
  }
  
  export interface ExpenseSummary {
    totalAmount: number;
    expenseCount: number;
    expenseByType: Record<string, number>;
    monthOverMonthChange: number;
  }
  
  export interface ExpenseFormData {
    expenseType: string;
    amount: string;
    currency: string;
    expenseDate: any; // Will be Dayjs type at runtime
    vendor: string;
    notes: string;
    isRecurring: boolean;
    recurrencePeriod: string;
    receipt?: File;
  }
  
  export interface ExpenseFilters {
    startDate: any; // Will be Dayjs type at runtime
    endDate: any; // Will be Dayjs type at runtime
    expenseType: string;
    minAmount: string;
    maxAmount: string;
    vendor: string;
    searchQuery: string;
    isRecurring?: boolean;
  }
  
  export type RecurrencePeriod = 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'none';

export interface ExpenseType {
  id: string;
  name: string;
}