// src/components/Expenses/RecurringExpensesManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  useTheme,
  Collapse
} from '@mui/material';
import LoopIcon from '@mui/icons-material/Loop';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import dayjs from 'dayjs';

import { Expense } from '../../models/expenses';
import { getNextRecurrenceDates } from '../../utils/recurringExpensesUtils';
import { expensesApi } from '../../services/expensesApi';
import { useAuth } from '../../contexts/AuthContext'; // Import auth context

interface RecurringExpensesManagerProps {
  expenses: Expense[];
  onRefresh: () => void;
}

const RecurringExpensesManager: React.FC<RecurringExpensesManagerProps> = ({
  expenses,
  onRefresh
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth(); // Get current user
  const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
  const [nextDates, setNextDates] = useState<Record<number, Date>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingRecurring, setGeneratingRecurring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false); // Add this state for collapsible behavior
  const [authError, setAuthError] = useState<string | null>(null);

  // Filter recurring expenses
  useEffect(() => {
    const recurring = expenses.filter(expense => expense.isRecurring);
    setRecurringExpenses(recurring);
    
    // Calculate next dates for recurring expenses
    if (recurring.length > 0) {
      setNextDates(getNextRecurrenceDates(recurring));
    }
  }, [expenses]);

  // Toggle expansion
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Generate missing recurring expenses with auth check
  const handleGenerateRecurringExpenses = async () => {
    // Check authentication first
    if (!currentUser) {
      setError('Authentication required. Please log in.');
      return;
    }
    
    try {
      setGeneratingRecurring(true);
      setError(null);
      setSuccess(null);
      
      // Call the API endpoint to generate missing recurring expenses
      const result = await expensesApi.generateRecurringExpenses();
      
      setSuccess(`Successfully generated ${result.count} recurring expense entries`);
      
      // Refresh the expenses list
      onRefresh();
    } catch (error: any) {
      console.error('Error generating recurring expenses:', error);
      
      // Handle auth errors specifically
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        setError(`Authentication error: ${error.message}. Please try logging in again.`);
      } else {
        setError(`Failed to generate recurring expenses: ${error.message}`);
      }
    } finally {
      setGeneratingRecurring(false);
    }
  };
  
  // Show detailed info for a recurring expense
  const handleShowDetails = (expense: Expense) => {
    // Check auth before showing details
    if (!currentUser) {
      setError('Authentication required to view expense details.');
      return;
    }
    
    setSelectedExpense(expense);
    setDetailsOpen(true);
  };
  
  // Format recurrence period for display
  const formatRecurrencePeriod = (period?: string): string => {
    if (!period) return 'Unknown';
    
    switch (period.toLowerCase()) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly (every 3 months)';
      case 'annually': return 'Annually (yearly)';
      default: return period;
    }
  };

  // Count of recurring expenses for header
  const recurringCount = recurringExpenses.length;

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      {/* Header with collapsible button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: expanded ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={toggleExpanded}>
          <EventRepeatIcon />
          <Typography variant="h6">
            Recurring Expenses {recurringCount > 0 && `(${recurringCount})`}
          </Typography>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        {expanded && (
          <Button
            variant="contained"
            color="primary"
            startIcon={generatingRecurring ? <CircularProgress size={20} color="inherit" /> : <LoopIcon />}
            onClick={handleGenerateRecurringExpenses}
            disabled={generatingRecurring || recurringExpenses.length === 0 || !currentUser}
            size="small"
          >
            {generatingRecurring ? 'Generating...' : 'Generate Missing Entries'}
          </Button>
        )}
      </Box>
      
      {/* Collapsible content */}
      <Collapse in={expanded}>
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {!currentUser && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            You must be logged in to manage recurring expenses.
          </Alert>
        )}
        
        {recurringExpenses.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No recurring expenses found. Create a recurring expense to see it here.
            </Typography>
          </Box>
        ) : (
          <List>
            {recurringExpenses.map((expense) => (
              <React.Fragment key={expense.id}>
                <ListItem 
                  sx={{ 
                    py: 1.5,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          {expense.expenseType} - {expense.currency}{expense.amount.toFixed(2)}
                        </Typography>
                        <Chip 
                          label={formatRecurrencePeriod(expense.recurrencePeriod)} 
                          size="small" 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Vendor: {expense.vendor || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Starting: {dayjs(expense.expenseDate).format('MMM D, YYYY')}
                        </Typography>
                        {nextDates[expense.id] && (
                          <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                            Next occurrence: {dayjs(nextDates[expense.id]).format('MMM D, YYYY')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Tooltip title="View Details">
                    <IconButton 
                      onClick={() => handleShowDetails(expense)}
                      disabled={!currentUser}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Collapse>
      
      {/* Recurring Expense Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedExpense && (
          <>
            <DialogTitle>
              Recurring Expense Details
              <IconButton
                aria-label="close"
                onClick={() => setDetailsOpen(false)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6">
                        {selectedExpense.expenseType}
                      </Typography>
                      <Chip 
                        label={formatRecurrencePeriod(selectedExpense.recurrencePeriod)} 
                        color="primary" 
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Amount
                      </Typography>
                      <Typography variant="body1">
                        {selectedExpense.currency}{selectedExpense.amount.toFixed(2)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Vendor
                      </Typography>
                      <Typography variant="body1">
                        {selectedExpense.vendor || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Start Date
                      </Typography>
                      <Typography variant="body1">
                        {dayjs(selectedExpense.expenseDate).format('MMMM D, YYYY')}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Next Occurrence
                      </Typography>
                      <Typography variant="body1" color="success.main">
                        {nextDates[selectedExpense.id] 
                          ? dayjs(nextDates[selectedExpense.id]).format('MMMM D, YYYY')
                          : 'Not calculated'}
                      </Typography>
                    </Grid>
                    
                    {selectedExpense.notes && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Notes
                        </Typography>
                        <Typography variant="body1">
                          {selectedExpense.notes}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default RecurringExpensesManager;