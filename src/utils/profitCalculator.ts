// src/utils/profitCalculator.ts
import { Sale } from '../services/salesApi';
import { Item } from '../services/api';
import { Expense } from '../models/expenses';
import { calculateTotalExpenses } from './expensesUtils';

/**
 * Calculate profit for a single sale
 */
export const calculateSaleProfit = (sale: Sale, allItems: Item[]): number => {
  // Find the corresponding item
  const soldItem = allItems.find(item => item.id === sale.itemId);
  if (!soldItem) {
    console.warn(`⚠️ No matching item found for sale ID ${sale.id}`);
    return 0;
  }
  
  const purchasePrice = soldItem.purchasePrice || 0;
  const salesTax = sale.salesTax || 0;
  const platformFees = sale.platformFees || 0;
  const shippingCost = soldItem.shippingPrice || 0;
  
  const profit = sale.salePrice - purchasePrice - salesTax - platformFees - shippingCost;
  
  console.log(`
    Sale ID: ${sale.id}
    Item ID: ${sale.itemId}
    Sale Price: $${sale.salePrice}
    Purchase Price: $${purchasePrice}
    Sales Tax: $${salesTax}
    Platform Fees: $${platformFees}
    Shipping Cost: $${shippingCost}
    ---------------------------
    Profit: $${profit.toFixed(2)}
  `);
  
  return profit;
};

/**
 * Debug calculation for net profit from sold items
 */
export const debugNetProfitFromSoldItems = (
  sales: Sale[], 
  expenses: Expense[], 
  items: Item[],
  dateRange?: { start: Date, end: Date }
): void => {
  console.log('🔎 Testing profit calculation with these inputs:');
  console.log(`- ${sales.length} sales`);
  console.log(`- ${expenses.length} expenses`);
  console.log(`- ${items.length} items`);
  
  // Filter by date range if provided
  let filteredSales = [...sales];
  let filteredExpenses = [...expenses];
  
  if (dateRange) {
    console.log(`- Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);
    
    filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate).getTime();
      return saleDate >= dateRange.start.getTime() && saleDate <= dateRange.end.getTime();
    });
    
    filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.expenseDate).getTime();
      return expenseDate >= dateRange.start.getTime() && expenseDate <= dateRange.end.getTime();
    });
    
    console.log(`- After filtering: ${filteredSales.length} sales, ${filteredExpenses.length} expenses`);
  }
  
  // Only include completed sales
  const completedSales = filteredSales.filter(sale => sale.status === 'completed');
  console.log(`- Completed sales: ${completedSales.length}`);
  
  if (completedSales.length === 0) {
    console.log('⚠️ No completed sales found');
    const totalExpenses = calculateTotalExpenses(filteredExpenses);
    console.log(`💸 Total expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`🧮 Final result (no sales): -$${totalExpenses.toFixed(2)}`);
    return;
  }
  
  // Calculate gross profit from each completed sale
  let salesProfit = 0;
  
  console.log('📊 Profit breakdown by sale:');
  completedSales.forEach(sale => {
    const saleProfit = calculateSaleProfit(sale, items);
    salesProfit += saleProfit;
  });
  
  console.log(`💵 Total sales profit: $${salesProfit.toFixed(2)}`);
  
  // Calculate total expenses
  const totalExpenses = calculateTotalExpenses(filteredExpenses);
  console.log(`💸 Total expenses: $${totalExpenses.toFixed(2)}`);
  
  // Calculate net profit
  const netProfit = salesProfit - totalExpenses;
  console.log(`🧮 Final calculation: $${salesProfit.toFixed(2)} - $${totalExpenses.toFixed(2)} = $${netProfit.toFixed(2)}`);
};