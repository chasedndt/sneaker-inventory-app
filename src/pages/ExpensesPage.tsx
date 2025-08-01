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
  AlertTitle,
  IconButton,
  CircularProgress,
  useTheme,
  Tooltip // Added Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import dayjs from 'dayjs';

import ExpenseEntryForm from '../components/Expenses/ExpenseEntryForm';
import ExpensesTable from '../components/Expenses/ExpensesTable';
import ExpenseFilters from '../components/Expenses/ExpenseFilters';
import ExpenseKPIMetrics from '../components/Expenses/ExpenseKPIMetrics';
import RecurringExpensesManager from '../components/Expenses/RecurringExpensesManager';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import ReceiptViewer from '../components/common/ReceiptViewer';

import { expensesApi, API_BASE_URL } from '../services/expensesApi';
import { Expense, ExpenseFilters as ExpenseFiltersType } from '../models/expenses';
import { useAuthReady } from '../hooks/useAuthReady';
import { useApi } from '../services/api'; // Import useApi for authenticated API calls
import { useSettings } from '../contexts/SettingsContext'; // Import useSettings
import { useAuth } from '../contexts/AuthContext'; // Import useAuth for auth token

const ExpensesPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser, authReady } = useAuthReady(); // Get auth readiness and user
  const accountTier = currentUser?.accountTier || 'Free'; // Derive accountTier
  const api = useApi(); // Get authenticated API methods
  const { currency: displayCurrency, convertCurrency, formatCurrency } = useSettings(); // Get currency settings
  const { getAuthToken } = useAuth(); // Get auth token method
  
  // Enhanced expense interface with pre-converted amounts
  interface ExpenseWithConversion extends Expense {
    convertedAmount: number; // Amount converted to display currency
    originalAmount: number;  // Original amount for reference
    originalCurrency: string; // Original currency for reference
  }
  
  // State for expenses
  const [expenses, setExpenses] = useState<ExpenseWithConversion[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithConversion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for selected expenses (for bulk actions)
  const [selectedExpenses, setSelectedExpenses] = useState<(string | number)[]>([]);
  
  // State for snackbar notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'info' });
  
  // State for expense summary
  const [expenseSummary, setExpenseSummary] = useState({
    totalAmount: 0,
    expenseCount: 0,
    expenseByType: {} as Record<string, number>,
    monthOverMonthChange: 0
  });
  
  // Types and interfaces
  interface DebugInfo {
    apiBaseUrl: string;
    responseStatus?: number;
    errorType?: string;
    lastAttemptedUrl?: string;
    corsError?: boolean;
    errorDetails?: string;
    allUrls?: string[];
    corsErrorDetails?: string;
    requestUrl?: string;
  }
  
  // State for modals
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState<boolean>(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState<boolean>(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isViewReceiptModalOpen, setIsViewReceiptModalOpen] = useState(false);
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    apiBaseUrl: API_BASE_URL,
    corsErrorDetails: undefined,
    requestUrl: undefined,
    errorType: undefined
  });

  // State for filters
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    startDate: null,
    endDate: null,
    expenseType: '',
    minAmount: '',
    maxAmount: '',
    vendor: '',
    searchQuery: '',
  });
  
  // Handler for receipt loading error
  const handleReceiptLoadError = (e?: React.SyntheticEvent<HTMLImageElement | HTMLIFrameElement>) => {
    // Check if this is a CORS error by inspecting the error event
    // For images, CORS errors usually result in the image being loaded but with naturalWidth=0
    // For iframes, we need to check differently
    const isCorsError = e?.currentTarget instanceof HTMLImageElement ? 
      (!e.currentTarget.complete && e.currentTarget.naturalWidth === 0) : 
      false;
    
    // Update debug info
    setDebugInfo(prev => ({  
      ...prev,
      corsError: isCorsError,
      errorType: isCorsError ? 'CORS Error' : 'Load Error',
      lastAttemptedUrl: currentReceiptUrl || undefined,
      // Add additional context about the error event
      corsErrorDetails: isCorsError ? 
        'Cross-Origin Resource Sharing (CORS) is blocking access to the receipt. The server needs to allow requests from http://localhost:3000.' : 
        prev.corsErrorDetails
    }));
    
    // Set appropriate error message
    const corsMsg = isCorsError ? 'CORS policy is blocking access - the backend needs to allow requests from http://localhost:3000' : '';
    const errMsg = isCorsError ?
      `Unable to load receipt due to CORS policy restrictions. The server needs to allow requests from http://localhost:3000.` :
      `Unable to load receipt. The file may not exist on the server or you may not have permission to access it.`;
    
    console.error(`Receipt loading error: ${errMsg}`);
    setReceiptError(errMsg);
  };
  
  // Handler for retry button
  const handleRetry = () => {
    // Reset error state
    setReceiptError(null);
    setReceiptLoading(true);
    
    // If we have the current expense with a receipt filename, attempt to load it again
    if (currentExpense && currentExpense.receiptFilename && currentUser) {
      handleViewReceipt(currentExpense);
    } else {
      // No expense to retry, just clear the error
      setReceiptLoading(false);
    }
  };
  
  // Handler for viewing a receipt
  const handleViewReceipt = (expense: Expense) => {
    if (!currentUser) {
      setSnackbar({ open: true, message: 'You must be logged in to view receipts', severity: 'error' });
      return;
    }
    
    if (!expense.receiptFilename) {
      setSnackbar({ open: true, message: 'This expense does not have a receipt', severity: 'warning' });
      return;
    }
    
    setCurrentExpense(expense);
    
    // Define the function to load a receipt
    const loadReceipt = async () => {
      try {
        setReceiptLoading(true);
        setReceiptError(null);
        
        // Clear debug info before starting
        setDebugInfo({
          apiBaseUrl: API_BASE_URL,
          requestUrl: undefined,
          errorDetails: undefined,
          errorType: undefined,
          corsError: undefined
        });
        
        const userId = currentUser.uid;
        const receiptFilename = expense.receiptFilename;
        
        // First try to get the URL from the API
        let apiUrl: string = '';
        try {
          if (expense.id && expense.receiptFilename) {
            // Log the attempt
            console.log(`🔄 Attempting to get receipt URL from API for expense ID ${expense.id}`);
            
            // Update debug info with request details
            setDebugInfo(prev => ({
              ...prev,
              requestUrl: `${API_BASE_URL}/expenses/${expense.id}/receipt-url`,
              receiptFilename
            }));
            
            // Make the actual API request
            apiUrl = await expensesApi.getReceiptUrl(expense.id, expense.receiptFilename);
            
            console.log(`✅ Received receipt URL from API: ${apiUrl}`);
            
            // Check if we got a valid URL from the API
            if (!apiUrl) {
              console.warn('⚠️ API returned empty URL, will use direct URL pattern');
            }
          } else {
            throw new Error('Missing expense ID or receipt filename');
          }
        } catch (urlError: any) {
          console.error('Error getting receipt URL from API:', urlError);
          
          // Check if this is a CORS error or authentication error
          const isCorsError = urlError.message && (
            urlError.message.includes('CORS') || 
            urlError.message.includes('cross-origin') ||
            urlError.message.includes('Cross-Origin')
          );
          
          // Update debug info with error details
          setDebugInfo(prev => ({
            ...prev,
            errorType: isCorsError ? 'CORS Error' : 'API Error',
            corsError: isCorsError,
            errorDetails: urlError.message || 'Unknown error getting receipt URL from API',
            corsErrorDetails: isCorsError ? 'The server is not configured to allow cross-origin requests from this application.' : undefined
          }));
          
          // We'll use the direct URL pattern since the API call failed
          console.warn('Using direct URL pattern due to API error');
        }
        
        // Get an authentication token
        const token = await getAuthToken();
        
        if (!token) {
          throw new Error('Unable to get authentication token');
        }
        
        // Use the standard receipt URL pattern with a proper subfolder structure
        // This is the pattern we will use for production
        const directUrl = `${API_BASE_URL}/uploads/${userId}/receipts/${receiptFilename}?token=${token}`;
        
        // Store URL info for debugging if needed
        setDebugInfo(prev => ({
          ...prev,
          apiBaseUrl: API_BASE_URL,
          expenseId: expense.id,
          userId,
          receiptFilename,
          attemptedUrls: apiUrl ? [apiUrl, directUrl] : [directUrl]
        }));
        
        // Use the URL that will work
        const finalUrl = apiUrl ? 
          (apiUrl.startsWith('http') ? apiUrl : `${API_BASE_URL}${apiUrl}`) : 
          directUrl;
        
        // Check if the receipt exists
        try {
          console.log(`🔄 Checking if receipt exists at ${finalUrl}`);
          const receiptCheck = await expensesApi.checkReceiptExists(finalUrl);
          
          const responseStatus = 'status' in receiptCheck ? 
            (receiptCheck as { exists: boolean; status: number }).status : 404;
          
          setDebugInfo(prev => ({
            ...prev,
            responseStatus,
            errorType: receiptCheck.exists ? undefined : 'File Not Found (404)',
            errorDetails: receiptCheck.exists ? undefined : 'The receipt file could not be found. Please make sure it was uploaded correctly.'
          }));
          
          if (!receiptCheck.exists) {
            console.warn(`Receipt not found (${responseStatus}): ${finalUrl}`);
            setReceiptError('Receipt file not found. Please make sure it was uploaded correctly.');
            setReceiptLoading(false);
            return;
          }
        } catch (checkError: any) {
          console.error('Error checking if receipt exists:', checkError);
          setDebugInfo(prev => ({
            ...prev,
            errorType: 'Request Error',
            errorDetails: checkError?.message || 'Unable to verify receipt existence'
          }));
        }
        
        // Set the URL and open the modal
        setCurrentReceiptUrl(finalUrl);
        setIsViewReceiptModalOpen(true);
        
      } catch (error: any) {
        console.error('Failed to load receipt:', error);
        setReceiptError('Failed to load receipt: ' + (error.message || 'Unknown error'));
        setDebugInfo(prev => ({
          ...prev,
          errorType: 'General Error',
          errorDetails: error.message || 'Unknown error loading receipt'
        }));
      } finally {
        setReceiptLoading(false);
      }
    };
    
    loadReceipt();
  };
  
  // Function to handle closing the snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Function to apply filters to expenses
  const applyFilters = (
    allExpenses: ExpenseWithConversion[], 
    currentFilters: ExpenseFiltersType,
    convertCurrencyFunc: (amount: number, fromCurrency: string) => number
  ): ExpenseWithConversion[] => {
    return allExpenses.filter((expense: ExpenseWithConversion) => {
      let passes = true;
      
      // Date range filter
      if (currentFilters.startDate && dayjs(expense.expenseDate).isBefore(currentFilters.startDate, 'day')) {
        passes = false;
      }
      if (currentFilters.endDate && dayjs(expense.expenseDate).isAfter(currentFilters.endDate, 'day')) {
        passes = false;
      }
      
      // Expense type filter
      if (currentFilters.expenseType && expense.expenseType !== currentFilters.expenseType) {
        passes = false;
      }

      // Amount range filter - use pre-converted amount (no additional conversion needed)
      if (currentFilters.minAmount && expense.convertedAmount < Number(currentFilters.minAmount)) {
        passes = false;
      }
      if (currentFilters.maxAmount && expense.convertedAmount > Number(currentFilters.maxAmount)) {
        passes = false;
      }
      
      // Vendor filter
      if (currentFilters.vendor && expense.vendor && !expense.vendor.toLowerCase().includes(currentFilters.vendor.toLowerCase())) {
        passes = false;
      }
      
      // Recurring expense filter
      if (currentFilters.isRecurring !== undefined && expense.isRecurring !== currentFilters.isRecurring) {
        passes = false;
      }
      
      // Search query filter
      if (currentFilters.searchQuery && 
          !(
            expense.notes.toLowerCase().includes(currentFilters.searchQuery.toLowerCase()) ||
            (expense.vendor && expense.vendor.toLowerCase().includes(currentFilters.searchQuery.toLowerCase())) ||
            expense.expenseType.toLowerCase().includes(currentFilters.searchQuery.toLowerCase())
          )
      ) {
        passes = false;
      }
      
      return passes;
    });
  };

  // Handler for filter changes from ExpenseFilters component
    // Handler for filter changes from ExpenseFilters component
  const handleFilterChange = (newFilters: Partial<ExpenseFiltersType>) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  };
  
  // Function to confirm expense deletion
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      await expensesApi.deleteExpense(expenseToDelete.id);
      await loadExpenses(); // Refresh the list
      setSnackbar({
        open: true,
        message: 'Expense deleted successfully',
        severity: 'success'
      });
    } catch (error: any) {
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
  
  // Function to confirm bulk expense deletion
  const handleConfirmBulkDelete = async () => {
    try {
      // Delete each selected expense
      await Promise.all(
        selectedExpenses.map(id => expensesApi.deleteExpense(id))
      );
      await loadExpenses(); // Refresh the list
      setSnackbar({
        open: true,
        message: `${selectedExpenses.length} expenses deleted successfully`,
        severity: 'success'
      });
      
      // Clear selection
      setSelectedExpenses([]);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `Failed to delete expenses: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  };
  
  // State for confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Handler for when an expense is saved (added or edited)
  const handleExpenseSaved = async (savedExpense: Expense, action: 'added' | 'updated') => {
    console.log(`✅ Expense ${action}:`, savedExpense);
    
    // Close modals
    setIsAddExpenseModalOpen(false);
    setIsEditExpenseModalOpen(false);
    setCurrentExpense(null);
    
    // Refresh the list to show new expense and any recurring entries
    console.log('🔄 Refreshing expense data to show changes...');
    await loadExpenses();
    
    // Show appropriate success message
    let message = `Expense ${action} successfully`;
    if (action === 'added' && savedExpense.isRecurring) {
      message = `Recurring expense created! Check the list for generated ${savedExpense.recurrencePeriod} entries.`;
    }
    
    setSnackbar({
      open: true,
      message,
      severity: 'success',
    });
  };
  
  // Effect to apply filters whenever expenses, filters, or currency settings change
  useEffect(() => {
    // Only apply filters if there are expenses to filter or if filters are actually set
    // This prevents running filter logic unnecessarily on initial empty states
    if (expenses.length > 0 || Object.values(filters).some(f => f !== null && f !== '' && f !== undefined)) {
      const newlyFiltered = applyFilters(expenses, filters, convertCurrency);
      setFilteredExpenses(newlyFiltered);
    } else {
      // If no expenses or no filters, filteredExpenses should mirror expenses (which might be empty)
      setFilteredExpenses(expenses);
    }
  }, [expenses, filters, convertCurrency]); // Dependencies for re-filtering

  // Effect to load expenses when component mounts or auth state changes
  const loadExpenses = useCallback(async () => {
    // Wait for authentication to be ready
    if (!authReady) {
      setLoading(true); // Indicate loading while auth is resolving
      // Clear data while waiting for auth state
      setExpenses([]);
      setFilteredExpenses([]);
      setExpenseSummary({
        totalAmount: 0,
        expenseCount: 0,
        expenseByType: {},
        monthOverMonthChange: 0,
      });
      return; // Exit if auth is not ready
    }

    // If auth is ready but there's no user, prompt to log in
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Please log in to view your expenses',
        severity: 'warning',
      });
      setExpenses([]);
      setFilteredExpenses([]);
      setExpenseSummary({
        totalAmount: 0,
        expenseCount: 0,
        expenseByType: {},
        monthOverMonthChange: 0,
      });
      setLoading(false); // Not loading data because no user
      return;
    }

    // Auth is ready and user exists, proceed to load expenses
    try {
      setLoading(true);
      setError(null);

      // Get expenses from API with backend currency conversion
      // Pass display currency to backend so it returns pre-converted values
      const fetchedExpenses = await expensesApi.getExpenses({ display_currency: displayCurrency });
      
      // Backend now returns expenses with convertedAmount, originalAmount, and originalCurrency
      // No frontend conversion needed - backend is the single source of truth
      const expensesWithConversion: ExpenseWithConversion[] = fetchedExpenses.map(expense => ({
        ...expense,
        convertedAmount: expense.convertedAmount || expense.amount, // Use backend conversion
        originalAmount: expense.originalAmount || expense.amount,
        originalCurrency: expense.originalCurrency || expense.currency || 'USD'
      }));
      
      console.log('💱 EXPENSE CONVERSION DEBUG:', {
        displayCurrency,
        expenseCount: expensesWithConversion.length,
        conversions: expensesWithConversion.map(exp => ({
          id: exp.id,
          original: `${exp.originalAmount} ${exp.originalCurrency}`,
          converted: `${exp.convertedAmount.toFixed(2)} ${displayCurrency}`,
          vendor: exp.vendor
        }))
      });

      // Calculate expense summary using pre-converted amounts (no additional conversions)
      const totalAmount = expensesWithConversion.reduce((sum, expense) => sum + expense.convertedAmount, 0);
      const expenseCount = expensesWithConversion.length;

      const expenseByType = expensesWithConversion.reduce((groups, expense) => {
        const type = expense.expenseType || 'Other';
        groups[type] = (groups[type] || 0) + expense.convertedAmount;
        return groups;
      }, {} as Record<string, number>);

      const monthOverMonthChange = 5.2; // Mock calculation

      setExpenseSummary({
        totalAmount,
        expenseCount,
        expenseByType,
        monthOverMonthChange,
      });

      // Set the converted expenses in state
      setExpenses(expensesWithConversion);
      // Apply current filters to the newly fetched expenses with conversions
      const currentlyFiltered = applyFilters(expensesWithConversion, filters, convertCurrency);
      setFilteredExpenses(currentlyFiltered);

    } catch (error: any) {
      console.error('Failed to load expenses:', error);
      setError(error.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [currentUser, authReady, filters, convertCurrency]); // Updated dependencies

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]); // useEffect now depends on the stable loadExpenses callback
  
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Expense Management
          </Typography>
        </Grid>
        
        {/* KPI Metrics Section */}
        <Grid item xs={12}>
          <ExpenseKPIMetrics summary={expenseSummary} />
        </Grid>
        
        {/* Action Buttons */}
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => setIsAddExpenseModalOpen(true)}
              sx={{ mr: 1 }}
            >
              Add Expense
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<FileUploadIcon />} 
              sx={{ mr: 1 }}
            >
              Import
            </Button>
            <Tooltip title={accountTier === 'Free' ? "Export feature available on Starter and Professional plans." : ""}>
              <span> {/* Tooltip needs a span wrapper when child is disabled */} 
                <Button 
                  variant="outlined" 
                  startIcon={<FileDownloadIcon />} 
                  sx={{ mr: 1 }}
                  disabled={accountTier === 'Free'}
                >
                  Export
                </Button>
              </span>
            </Tooltip>
          </Box>
          <Box>
            {selectedExpenses.length > 0 && (
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />} 
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                sx={{ mr: 1 }}
              >
                Delete Selected ({selectedExpenses.length})
              </Button>
            )}
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={() => console.log('Refresh clicked')}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Grid>
        
        {/* Filters Section */}
        <Grid item xs={12}>
          <ExpenseFilters 
            onFilterChange={handleFilterChange} 
            activeFiltersCount={Object.values(filters).filter(v => v !== '' && v !== null).length} 
          />
        </Grid>
        
        {/* Expenses Table */}
        <Grid item xs={12}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <ExpensesTable 
              expenses={filteredExpenses} 
              formatCurrency={formatCurrency} // Pass formatCurrency
              onEdit={(expense) => {
                setCurrentExpense(expense);
                setIsEditExpenseModalOpen(true);
              }} 
              onDelete={(expense) => {
                setExpenseToDelete(expense);
                setIsDeleteConfirmOpen(true);
              }} 
              onViewReceipt={handleViewReceipt}
              selectedExpenses={selectedExpenses}
              onSelectExpense={(id, isSelected) => {
                if (isSelected) {
                  setSelectedExpenses(prev => [...prev, id]);
                } else {
                  setSelectedExpenses(prev => prev.filter(expId => expId !== id));
                }
              }}
              onSelectAll={(isSelected) => {
                if (isSelected) {
                  setSelectedExpenses(filteredExpenses.map(exp => exp.id));
                } else {
                  setSelectedExpenses([]);
                }
              }}
            />
          )}
        </Grid>
      </Grid>
      
      {/* Add Expense Modal */}
      <Dialog open={isAddExpenseModalOpen} onClose={() => setIsAddExpenseModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Add New Expense
          <IconButton 
            aria-label="close" 
            onClick={() => setIsAddExpenseModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ExpenseEntryForm 
            onSave={(expense: Expense) => handleExpenseSaved(expense, 'added')} 
            onCancel={() => setIsAddExpenseModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Expense Modal */}
      <Dialog open={isEditExpenseModalOpen} onClose={() => setIsEditExpenseModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Expense
          <IconButton 
            aria-label="close" 
            onClick={() => setIsEditExpenseModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {currentExpense && (
            <ExpenseEntryForm 
              initialExpense={currentExpense} 
              onSave={(expense: Expense) => handleExpenseSaved(expense, 'updated')} 
              onCancel={() => setIsEditExpenseModalOpen(false)}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* View Receipt Modal */}
      <ReceiptViewer
        open={isViewReceiptModalOpen}
        onClose={() => setIsViewReceiptModalOpen(false)}
        receiptUrl={currentReceiptUrl}
        expenseName={currentExpense ? `${currentExpense.expenseType} - $${currentExpense.amount}` : undefined}
        onRetry={handleRetry}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense: ${expenseToDelete?.expenseType} for $${expenseToDelete?.amount}?`}
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
        message={`Are you sure you want to delete ${selectedExpenses.length} selected expenses? This action cannot be undone.`}
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