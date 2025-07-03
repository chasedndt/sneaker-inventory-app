// src/utils/recurringExpensesUtils.ts
import dayjs from 'dayjs';
import { Expense } from '../models/expenses';

/**
 * Calculate the next date based on a recurrence period
 * @param currentDate Base date to calculate from
 * @param recurrencePeriod Type of recurrence (weekly, monthly, quarterly, annually)
 * @returns The next date in the recurrence schedule
 */
export const calculateNextRecurrenceDate = (
  currentDate: Date | string,
  recurrencePeriod: string
): Date => {
  const dateObj = dayjs(currentDate);
  
  switch (recurrencePeriod.toLowerCase()) {
    case 'weekly':
      return dateObj.add(1, 'week').toDate();
    case 'monthly':
      return dateObj.add(1, 'month').toDate();
    case 'quarterly':
      return dateObj.add(3, 'month').toDate();
    case 'annually':
      return dateObj.add(1, 'year').toDate();
    default:
      throw new Error(`Unknown recurrence period: ${recurrencePeriod}`);
  }
};

/**
 * Generate all missing recurring expense entries between start date and current date
 * @param baseExpense The original recurring expense
 * @param currentDate The current date to generate entries up to
 * @returns Array of new expense entries that should be created
 */
export const generateRecurringExpenseEntries = (
  baseExpense: Expense,
  currentDate: Date = new Date()
): Expense[] => {
  // If not recurring or no recurrence period defined, return empty array
  if (!baseExpense.isRecurring || !baseExpense.recurrencePeriod) {
    console.log('⚠️ Not generating recurring entries: not recurring or no recurrence period');
    return [];
  }
  
  console.log(`🔄 Generating recurring entries from ${baseExpense.expenseDate} to ${currentDate.toISOString()}`);
  console.log(`📅 Recurrence period: ${baseExpense.recurrencePeriod}`);
  
  const newEntries: Expense[] = [];
  let nextDate = calculateNextRecurrenceDate(
    baseExpense.expenseDate,
    baseExpense.recurrencePeriod
  );
  const currentDateObj = dayjs(currentDate);
  
  console.log(`📅 First next date calculated: ${nextDate.toISOString()}`);
  
  // Keep generating entries until we reach the current date
  while (dayjs(nextDate).isBefore(currentDateObj) || dayjs(nextDate).isSame(currentDateObj, 'day')) {
    console.log(`📅 Generating entry for date: ${nextDate.toISOString()}`);
    
    // Create a new entry based on the base expense but with the new date
    const newEntry: Expense = {
      ...baseExpense,
      id: 0, // This will be assigned by the backend
      expenseDate: nextDate.toISOString(),
      created_at: undefined,
      updated_at: undefined,
      // Mark this as generated from a recurring expense
      notes: baseExpense.notes 
        ? `${baseExpense.notes} (Recurring from ${dayjs(baseExpense.expenseDate).format('MM/DD/YYYY')})`
        : `Recurring from ${dayjs(baseExpense.expenseDate).format('MM/DD/YYYY')}`
    };
    
    newEntries.push(newEntry);
    
    // Calculate the next date
    nextDate = calculateNextRecurrenceDate(nextDate, baseExpense.recurrencePeriod);
    console.log(`📅 Next calculated date: ${nextDate.toISOString()}`);
    
    // Safety check to prevent infinite loops
    if (newEntries.length > 100) {
      console.warn('⚠️ Generated more than 100 recurring entries, stopping to prevent infinite loop');
      break;
    }
  }
  
  console.log(`✅ Generated ${newEntries.length} recurring entries`);
  return newEntries;
};

/**
 * Get the next recurrence dates for all recurring expenses
 * @param expenses List of expenses to analyze 
 * @returns Object mapping expense IDs to their next recurrence date
 */
export const getNextRecurrenceDates = (
  expenses: Expense[]
): Record<number, Date> => {
  const nextDates: Record<number, Date> = {};
  const now = new Date();
  
  expenses.forEach(expense => {
    if (expense.isRecurring && expense.recurrencePeriod) {
      // Find the next occurrence after now
      let nextDate = calculateNextRecurrenceDate(
        expense.expenseDate, 
        expense.recurrencePeriod
      );
      
      // If next date is in the past, keep calculating until we find a future date
      while (nextDate < now) {
        nextDate = calculateNextRecurrenceDate(
          nextDate,
          expense.recurrencePeriod
        );
      }
      
      nextDates[expense.id] = nextDate;
    }
  });
  
  return nextDates;
};