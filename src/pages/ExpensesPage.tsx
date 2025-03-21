// src/pages/ExpensesPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  CircularProgress,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';

import ExpenseEntryForm from '../components/Expenses/ExpenseEntryForm';
import ExpensesTable from '../components/Expenses/ExpensesTable';
import ExpenseFilters from '../components/Expenses/ExpenseFilters';
import ExpenseKPIMetrics from '../components/Expenses/ExpenseKPIMetrics';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

import { expensesApi } from '../services/expensesApi';
import { Expense, ExpenseFilters as ExpenseFiltersType } from '../models/expenses';

const ExpensesPage: React.FC = () => {
  const theme = useTheme();
  
  // State for expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for selected expenses (for bulk actions)
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);
  
  // State for expense summary
  const [expenseSummary, setExpenseSummary] = useState({
    totalAmount: 0,
    expenseCount: 0,
    expenseByType: {} as Record<string, number>,
    monthOverMonthChange: 0
  });
  
  // State for modals
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState<boolean>(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState<boolean>(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [isViewReceiptModalOpen, setIsViewReceiptModalOpen] = useState<boolean>(false);
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | null>(null);
  
  // State for confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState<boolean>(false);
  
  // State for filters
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    startDate: null,
    endDate: null,
    expenseType: '',
    minAmount: '',
    maxAmount: '',
    vendor: '',
    searchQuery: '',
    isRecurring: undefined
  });
  
  // State for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });
  
  // Calculate the number of active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.expenseType) count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.vendor) count++;
    if (filters.searchQuery) count++;
    if (filters.isRecurring !== undefined) count++;
    return count;
  }, [filters]);
  
  // Fetch expenses from API
  const fetchExpenses = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Convert dates to Date objects for the API
      const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
      
      const expensesData = await expensesApi.getExpenses(startDate, endDate);
      const summaryData = await expensesApi.getExpenseSummary(startDate, endDate);
      
      setExpenses(expensesData);
      setExpenseSummary(summaryData);
      setError(null);
      
      // Apply other filters
      applyFilters(expensesData);
      
      if (showRefreshing) {
        setSnackbar({
          open: true,
          message: 'Expenses refreshed successfully',
          severity: 'success'
        });
      }
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError(`Failed to load expenses: ${err.message}`);
      
      if (showRefreshing) {
        setSnackbar({
          open: true,
          message: `Error refreshing expenses: ${err.message}`,
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);
  
  // Apply filters to expenses
  const applyFilters = useCallback((expensesToFilter: Expense[]) => {
    let result = [...expensesToFilter];
    
    // Filter by expense type
    if (filters.expenseType) {
      result = result.filter(expense => expense.expenseType === filters.expenseType);
    }
    
    // Filter by min amount
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        result = result.filter(expense => expense.amount >= minAmount);
      }
    }
    
    // Filter by max amount
    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        result = result.filter(expense => expense.amount <= maxAmount);
      }
    }
    
    // Filter by vendor
    if (filters.vendor) {
      result = result.filter(expense => 
        expense.vendor.toLowerCase().includes(filters.vendor.toLowerCase())
      );
    }
    
    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(expense => 
        expense.expenseType.toLowerCase().includes(query) ||
        expense.vendor.toLowerCase().includes(query) ||
        expense.notes.toLowerCase().includes(query)
      );
    }
    
    // Filter by recurring status
    if (filters.isRecurring !== undefined) {
      result = result.filter(expense => expense.isRecurring === filters.isRecurring);
    }
    
    setFilteredExpenses(result);
  }, [filters]);
  
  // Initial fetch
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);
  
  // Apply filters when expenses or filters change
  useEffect(() => {
    applyFilters(expenses);
  }, [expenses, applyFilters]);
  
  // Handle filter changes
  const handleFilterChange = (newFilters: ExpenseFiltersType) => {
    setFilters(newFilters);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchExpenses(true);
  };
  
  // Handle selection of expenses
  const handleSelectExpense = (expenseId: number, checked: boolean) => {
    if (checked) {
      setSelectedExpenses(prev => [...prev, expenseId]);
    } else {
      setSelectedExpenses(prev => prev.filter(id => id !== expenseId));
    }
  };
  
  // Handle select all expenses
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredExpenses.map(expense => expense.id);
      setSelectedExpenses(allIds);
    } else {
      setSelectedExpenses([]);
    }
  };
  
  // Handle adding a new expense
  const handleAddExpense = () => {
    setCurrentExpense(null);
    setIsAddExpenseModalOpen(true);
  };
  
  // Handle saving a new expense
  const handleSaveExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    setIsAddExpenseModalOpen(false);
    
    setSnackbar({
      open: true,
      message: 'Expense added successfully',
      severity: 'success'
    });
  };
  
  // Handle editing an expense
  const handleEditExpense = (expense: Expense) => {
    setCurrentExpense(expense);
    setIsEditExpenseModalOpen(true);
  };
  
  // Handle updating an expense
  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => 
      prev.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    );
    setIsEditExpenseModalOpen(false);
    
    setSnackbar({
      open: true,
      message: 'Expense updated successfully',
      severity: 'success'
    });
  };
  
  // Handle deleting an expense
  const handleDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteConfirmOpen(true);
  };
  
  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      await expensesApi.deleteExpense(expenseToDelete.id);
      
      setExpenses(prev => 
        prev.filter(expense => expense.id !== expenseToDelete.id)
      );
      
      setSnackbar({
        open: true,
        message: 'Expense deleted successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to delete expense: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedExpenses.length === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };
  
  // Handle confirming bulk deletion
  const handleConfirmBulkDelete = async () => {
    try {
      // Delete each selected expense
      await Promise.all(
        selectedExpenses.map(id => expensesApi.deleteExpense(id))
      );
      
      // Update local state
      setExpenses(prev => 
        prev.filter(expense => !selectedExpenses.includes(expense.id))
      );
      
      setSnackbar({
        open: true,
        message: `${selectedExpenses.length} expenses deleted successfully`,
        severity: 'success'
      });
      
      // Clear selection
      setSelectedExpenses([]);
    } catch (error: any) {
      console.error('Error deleting expenses:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to delete expenses: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  };
  
  // Handle viewing a receipt
  const handleViewReceipt = (expense: Expense) => {
    if (!expense.receiptFilename) return;
    
    // Construct URL for receipt
    const receiptUrl = `http://127.0.0.1:5000/api/uploads/${expense.receiptFilename}`;
    
    setCurrentReceiptUrl(receiptUrl);
    setIsViewReceiptModalOpen(true);
  };
  
  // Handle exporting expenses as CSV
  const handleExportCSV = () => {
    // Get expenses to export (filtered or all)
    const expensesToExport = filteredExpenses.length > 0 ? filteredExpenses : expenses;
    
    // Create CSV content
    const headers = ['ID', 'Type', 'Amount', 'Currency', 'Date', 'Vendor', 'Notes', 'Recurring'];
    const csvContent = [
      headers.join(','),
      ...expensesToExport.map(expense => [
        expense.id,
        expense.expenseType,
        expense.amount,
        expense.currency,
        expense.expenseDate,
        `"${expense.vendor.replace(/"/g, '""')}"`,
        `"${expense.notes.replace(/"/g, '""')}"`,
        expense.isRecurring ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSnackbar({
      open: true,
      message: `${expensesToExport.length} expenses exported as CSV`,
      severity: 'success'
    });
  };
  
  // Handle closing snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  return (
    <Box sx={{ py: 3, px: 2, bgcolor: theme.palette.background.default }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Expenses
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>
      
      {/* KPI Metrics */}
      <ExpenseKPIMetrics 
        summary={expenseSummary} 
        dateRange={{
          startDate: filters.startDate ? dayjs(filters.startDate).format() : null,
          endDate: filters.endDate ? dayjs(filters.endDate).format() : null
        }}
      />
      
      {/* Filters */}
      <ExpenseFilters 
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        activeFiltersCount={activeFiltersCount}
      />
      
      {/* Action bar for selected expenses */}
      {selectedExpenses.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          mb: 2,
          bgcolor: theme.palette.primary.main,
          color: 'white',
          borderRadius: 1
        }}>
          <Typography variant="body1">
            {selectedExpenses.length} expenses selected
          </Typography>
          
          <Button 
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDelete}
            sx={{ bgcolor: 'error.dark' }}
          >
            Delete Selected
          </Button>
        </Box>
      )}
      
      {/* Expenses table */}
      <ExpensesTable 
        expenses={filteredExpenses}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
        onViewReceipt={handleViewReceipt}
        loading={loading}
        error={error}
        selectedExpenses={selectedExpenses}
        onSelectExpense={handleSelectExpense}
        onSelectAll={handleSelectAll}
      />
      
      {/* Add Expense FAB */}
      <Fab 
        color="primary" 
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleAddExpense}
      >
        <AddIcon />
      </Fab>
      
      {/* Add Expense Modal */}
      <Dialog 
        open={isAddExpenseModalOpen} 
        onClose={() => setIsAddExpenseModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <ExpenseEntryForm 
            onSave={handleSaveExpense}
            onCancel={() => setIsAddExpenseModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Expense Modal */}
      <Dialog 
        open={isEditExpenseModalOpen} 
        onClose={() => setIsEditExpenseModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {currentExpense && (
            <ExpenseEntryForm 
              initialExpense={currentExpense}
              onSave={handleUpdateExpense}
              onCancel={() => setIsEditExpenseModalOpen(false)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* View Receipt Modal */}
      <Dialog 
        open={isViewReceiptModalOpen} 
        onClose={() => setIsViewReceiptModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Receipt
          <IconButton onClick={() => setIsViewReceiptModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {currentReceiptUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              {currentReceiptUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={currentReceiptUrl} 
                  width="100%" 
                  height="500px" 
                  style={{ border: 'none' }}
                  title="Receipt PDF"
                />
              ) : (
                <img 
                  src={currentReceiptUrl} 
                  alt="Receipt" 
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                />
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense: ${expenseToDelete?.expenseType} for ${expenseToDelete?.amount}?`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        confirmButtonColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
      
      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isBulkDeleteConfirmOpen}
        title="Delete Multiple Expenses"
        message={`Are you sure you want to delete ${selectedExpenses.length} expenses? This action cannot be undone.`}
        confirmButtonText="Delete All"
        cancelButtonText="Cancel"
        confirmButtonColor="error"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
      />
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={5000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExpensesPage;