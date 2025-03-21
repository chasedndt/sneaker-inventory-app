// src/utils/expensesUtils.ts
import { Expense } from '../models/expenses';

/**
 * Calculate total expenses from an array of expenses
 * @param expenses Array of expense objects
 * @returns Total amount of all expenses
 */
export const calculateTotalExpenses = (expenses: Expense[]): number => {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
};

/**
 * Group expenses by type and calculate totals
 * @param expenses Array of expense objects
 * @returns Object with expense type as key and total amount as value
 */
export const groupExpensesByType = (expenses: Expense[]): Record<string, number> => {
  return expenses.reduce((groups, expense) => {
    const type = expense.expenseType;
    if (!groups[type]) {
      groups[type] = 0;
    }
    groups[type] += expense.amount;
    return groups;
  }, {} as Record<string, number>);
};

/**
 * Calculate month-over-month change in expenses
 * @param currentExpenses Current month expenses
 * @param previousExpenses Previous month expenses
 * @returns Percentage change
 */
export const calculateMonthOverMonthChange = (
  currentExpenses: Expense[],
  previousExpenses: Expense[]
): number => {
  const currentTotal = calculateTotalExpenses(currentExpenses);
  const previousTotal = calculateTotalExpenses(previousExpenses);
  
  if (previousTotal === 0) return 0;
  
  return ((currentTotal - previousTotal) / previousTotal) * 100;
};

/**
 * Filter expenses by date range
 * @param expenses Array of expense objects
 * @param startDate Start date for filtering
 * @param endDate End date for filtering
 * @returns Filtered array of expenses
 */
export const filterExpensesByDateRange = (
  expenses: Expense[],
  startDate: Date | null,
  endDate: Date | null
): Expense[] => {
  if (!startDate && !endDate) return expenses;
  
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate);
    
    if (startDate && endDate) {
      return expenseDate >= startDate && expenseDate <= endDate;
    }
    
    if (startDate) {
      return expenseDate >= startDate;
    }
    
    if (endDate) {
      return expenseDate <= endDate;
    }
    
    return true;
  });
};

/**
 * Get recurring expenses
 * @param expenses Array of expense objects
 * @returns Array of recurring expenses
 */
export const getRecurringExpenses = (expenses: Expense[]): Expense[] => {
  return expenses.filter(expense => expense.isRecurring);
};

/**
 * Format currency amount
 * @param amount Amount to format
 * @param currency Currency symbol
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = '$'): string => {
  return `${currency}${amount.toFixed(2)}`;
};

/**
 * Check if a date is within the current month
 * @param date Date to check
 * @returns Boolean indicating if date is in current month
 */
export const isCurrentMonth = (date: string): boolean => {
  const now = new Date();
  const expenseDate = new Date(date);
  
  return (
    expenseDate.getMonth() === now.getMonth() &&
    expenseDate.getFullYear() === now.getFullYear()
  );
};

/**
 * Calculate total expenses for the current month
 * @param expenses Array of expense objects
 * @returns Total expenses for current month
 */
export const getCurrentMonthExpenses = (expenses: Expense[]): number => {
  const currentMonthExpenses = expenses.filter(expense => isCurrentMonth(expense.expenseDate));
  return calculateTotalExpenses(currentMonthExpenses);
};