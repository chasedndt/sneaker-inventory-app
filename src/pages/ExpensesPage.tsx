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
import RecurringExpensesManager from '../components/Expenses/RecurringExpensesManager';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

import { expensesApi } from '../services/expensesApi';
import { Expense, ExpenseFilters as ExpenseFiltersType } from '../models/expenses';
import { useAuth } from '../contexts/AuthContext'; // Import auth context
import { useApi } from '../services/api'; // Import useApi for authenticated API calls

const ExpensesPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser, loading: authLoading } = useAuth(); // Get auth state
  const api = useApi(); // Get authenticated API methods
  
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
  
  // Cooldown state to prevent infinite error loops
  const [authErrorCooldown, setAuthErrorCooldown] = useState(false);

  // Fetch expenses from API - now with auth handling
  const fetchExpenses = useCallback(async (showRefreshing = false) => {
    // Don't fetch if not authenticated
    if (!currentUser) {
      setLoading(false);
      setError("Authentication required to view expenses");
      return;
    }
    
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Convert dates to Date objects for the API
      const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
      
      // Use authenticated API call
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
      
      // Handle authentication errors specifically
      if (err.message.includes('Authentication') || err.message.includes('token')) {
        setError(`Authentication error: ${err.message}. Please try logging in again.`);
      } else {
        setError(`Failed to load expenses: ${err.message}`);
      }
      
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
  }, [filters, currentUser]);
  
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
  
  // Initial fetch - now checks for authentication first
  useEffect(() => {
    if (!authLoading) { // Only fetch after auth state is determined
      fetchExpenses();
    }
  }, [fetchExpenses, authLoading]);
  
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
  
  // Handle adding a new expense - with auth check
  const handleAddExpense = () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to add expenses',
        severity: 'error'
      });
      return;
    }
    
    setCurrentExpense(null);
    setIsAddExpenseModalOpen(true);
  };
  
  // Handle saving a new expense - with auth
  // IMPORTANT: This function is called by ExpenseEntryForm after it has already created the expense
  // We should NOT create the expense again, just update the UI
  const handleSaveExpense = async (expense: Expense) => {
    try {
      // Close modals and clear current expense
      setIsAddExpenseModalOpen(false);
      setCurrentExpense(null);
      
      // Set loading state
      setLoading(true);
      
      console.log('🔵 handleSaveExpense received already saved expense:', expense.id, expense.expenseType);
      
      // CRITICAL: Do NOT create the expense again!
      // The expense has already been created by ExpenseEntryForm
      
      // Just refresh the expense list to show the new expense
      console.log('🔄 Refreshing expense list after expense was saved');
      await fetchExpenses(false);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Expense added successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('❌ Error in handleSaveExpense:', error);
      
      // Error handling
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        setSnackbar({
          open: true,
          message: `Authentication error: ${error.message}. Please try logging in again.`,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Error refreshing expenses: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle editing an expense - with auth check
  const handleEditExpense = (expense: Expense) => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to edit expenses',
        severity: 'error'
      });
      return;
    }
    
    setCurrentExpense(expense);
    setIsEditExpenseModalOpen(true);
  };
  
  // Handle updating an expense - with auth
  // IMPORTANT: This function is called by ExpenseEntryForm after it has already updated the expense
  // We should NOT update the expense again, just update the UI
  const handleUpdateExpense = async (updatedExpense: Expense) => {
    try {
      // Close modals and clear current expense
      setIsEditExpenseModalOpen(false);
      setCurrentExpense(null);
      
      // Set loading state
      setLoading(true);
      
      console.log('🔵 handleUpdateExpense received already updated expense:', updatedExpense.id, updatedExpense.expenseType);
      
      // CRITICAL: Do NOT update the expense again!
      // The expense has already been updated by ExpenseEntryForm
      
      // Just refresh the expense list to show the updated expense
      console.log('🔄 Refreshing expense list after expense was updated');
      await fetchExpenses(false);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Expense updated successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('❌ Error in handleUpdateExpense:', error);
      
      // Error handling
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        setSnackbar({
          open: true,
          message: `Authentication error: ${error.message}. Please try logging in again.`,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Error refreshing expenses: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting an expense - with auth check
  const handleDeleteExpense = (expense: Expense) => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to delete expenses',
        severity: 'error'
      });
      return;
    }
    
    setExpenseToDelete(expense);
    setIsDeleteConfirmOpen(true);
  };
  
  // Handle confirming deletion - with auth
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      await expensesApi.deleteExpense(expenseToDelete.id);
      
      // Instead of manually updating the state, fetch all expenses again
      await fetchExpenses(false);
      
      setSnackbar({
        open: true,
        message: 'Expense deleted successfully',
        severity: 'success'
      });
    } catch (error: any) {
      // Handle auth errors
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        setSnackbar({
          open: true,
          message: `Authentication error: ${error.message}. Please try logging in again.`,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete expense: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setIsDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    }
  };
  
  // Handle bulk delete - with auth check
  const handleBulkDelete = () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to delete expenses',
        severity: 'error'
      });
      return;
    }
    
    if (selectedExpenses.length === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };
  
  // Handle confirming bulk deletion - with auth
  const handleConfirmBulkDelete = async () => {
    try {
      // Delete each selected expense
      await Promise.all(
        selectedExpenses.map(id => expensesApi.deleteExpense(id))
      );
      
      // Instead of manually updating the state, fetch all expenses again
      await fetchExpenses(false);
      
      setSnackbar({
        open: true,
        message: `${selectedExpenses.length} expenses deleted successfully`,
        severity: 'success'
      });
      
      // Clear selection
      setSelectedExpenses([]);
    } catch (error: any) {
      // Handle auth errors
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        setSnackbar({
          open: true,
          message: `Authentication error: ${error.message}. Please try logging in again.`,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete expenses: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  };
  
  // Handle viewing a receipt - with auth check
  // In ExpensesPage.tsx, change the handleViewReceipt function:

const handleViewReceipt = (expense: Expense) => {
  if (!currentUser) {
    setSnackbar({
      open: true,
      message: 'You must be logged in to view receipts',
      severity: 'error'
    });
    return;
  }
  
  if (!expense.receiptFilename) return;
  
  // Use API_BASE_URL from the API for consistency
  const API_BASE_URL = 'http://127.0.0.1:5000/api';
  
  // Instead of using api.getAuthToken, directly use auth context
  const getToken = async () => {
    try {
      // Simply construct URL without token - the browser will include auth cookies
      const receiptUrl = `${API_BASE_URL}/uploads/${expense.receiptFilename}`;
      setCurrentReceiptUrl(receiptUrl);
      setIsViewReceiptModalOpen(true);
    } catch (error) {
      console.error("Error getting receipt:", error);
      setSnackbar({
        open: true,
        message: 'Failed to load receipt',
        severity: 'error'
      });
    }
  };
  
  getToken();
};
  
  // Handle exporting expenses as CSV - with auth check
  const handleExportCSV = () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to export expenses',
        severity: 'error'
      });
      return;
    }
    
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
  
  // Show auth loading state
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Authenticating...
        </Typography>
      </Box>
    );
  }
  
  // Show auth required message if not logged in
  if (!currentUser) {
    return (
      <Box sx={{ py: 3, px: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          You must be logged in to view and manage expenses.
        </Alert>
        <Typography variant="body1">
          Please log in to access the expenses page. If you were previously logged in, your session may have expired.
        </Typography>
      </Box>
    );
  }
  
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
      
      {/* Recurring Expenses Manager - Now collapsible */}
      <RecurringExpensesManager 
        expenses={expenses}
        onRefresh={handleRefresh}
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