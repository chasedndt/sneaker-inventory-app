// src/components/Expenses/ExpenseEntryForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Grid,
  Paper,
  Alert,
  InputAdornment,
  SelectChangeEvent,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CancelIcon from '@mui/icons-material/Cancel';
import dayjs from 'dayjs';

import { ExpenseFormData, Expense } from '../../models/expenses';
import { expensesApi } from '../../services/expensesApi';

interface ExpenseEntryFormProps {
  initialExpense?: Expense;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const ExpenseEntryForm: React.FC<ExpenseEntryFormProps> = ({
  initialExpense,
  onSave,
  onCancel,
  isEditing = false,
}) => {
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseType: '',
    amount: '',
    currency: '$',
    expenseDate: dayjs(),
    vendor: '',
    notes: '',
    isRecurring: false,
    recurrencePeriod: 'monthly',
  });
  const [receipt, setReceipt] = useState<File | undefined>(undefined);
  const [receiptName, setReceiptName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch expense types on component mount
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const types = await expensesApi.getExpenseTypes();
        setExpenseTypes(types);
      } catch (error) {
        console.error('Failed to fetch expense types:', error);
        setExpenseTypes([
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
          'Other',
        ]);
      }
    };

    fetchExpenseTypes();
  }, []);

  // Initialize form with existing expense data if editing
  useEffect(() => {
    if (initialExpense) {
      setFormData({
        expenseType: initialExpense.expenseType,
        amount: initialExpense.amount.toString(),
        currency: initialExpense.currency,
        expenseDate: dayjs(initialExpense.expenseDate),
        vendor: initialExpense.vendor,
        notes: initialExpense.notes,
        isRecurring: initialExpense.isRecurring,
        recurrencePeriod: initialExpense.recurrencePeriod || 'monthly',
      });
      
      if (initialExpense.receiptFilename) {
        setReceiptName(initialExpense.receiptFilename);
      }
    }
  }, [initialExpense]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (value: dayjs.Dayjs | null) => {
    setFormData((prev) => ({ ...prev, expenseDate: value || dayjs() }));
  };

  const handleRecurringToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isRecurring: e.target.checked }));
  };

  const handleRecurrencePeriodChange = (e: SelectChangeEvent<string>) => {
    setFormData((prev) => ({ ...prev, recurrencePeriod: e.target.value }));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setReceipt(file);
      setReceiptName(file.name);
    }
  };

  const clearReceipt = () => {
    setReceipt(undefined);
    setReceiptName('');
  };

  const validateForm = (): boolean => {
    if (!formData.expenseType) {
      setError('Expense type is required');
      return false;
    }
    
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setError('Valid amount is required');
      return false;
    }
    
    if (!formData.expenseDate) {
      setError('Expense date is required');
      return false;
    }
    
    if (formData.isRecurring && !formData.recurrencePeriod) {
      setError('Recurrence period is required for recurring expenses');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare expense data for API
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate.toISOString(),
        receipt
      };
      
      let savedExpense: Expense;
      
      if (isEditing && initialExpense) {
        // Update existing expense
        savedExpense = await expensesApi.updateExpense(initialExpense.id, expenseData);
      } else {
        // Create new expense
        savedExpense = await expensesApi.createExpense(expenseData);
      }
      
      // Call the onSave callback with the saved expense
      onSave(savedExpense);
    } catch (error: any) {
      console.error('Error saving expense:', error);
      setError(`Failed to save expense: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ p: 3, m: 0 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" mb={3}>
            {isEditing ? 'Edit Expense' : 'Add New Expense'}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )} 
          
          <Grid container spacing={2}>
            {/* Expense Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Expense Type</InputLabel>
                <Select
                  name="expenseType"
                  value={formData.expenseType}
                  onChange={handleSelectChange}
                  label="Expense Type"
                >
                  {expenseTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {formData.currency}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {/* Date */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expense Date"
                value={formData.expenseDate}
                onChange={handleDateChange}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>
            
            {/* Vendor */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vendor/Payee"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
              />
            </Grid>
            
            {/* Recurring Expense Toggle */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRecurring}
                    onChange={handleRecurringToggle}
                    name="isRecurring"
                    color="primary"
                  />
                }
                label="Recurring Expense"
              />
            </Grid>
            
            {/* Recurrence Period (visible only if isRecurring is true) */}
            {formData.isRecurring && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Recurrence Period</InputLabel>
                  <Select
                    name="recurrencePeriod"
                    value={formData.recurrencePeriod}
                    onChange={handleRecurrencePeriodChange}
                    label="Recurrence Period"
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="annually">Annually</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {/* Receipt Upload */}
            <Grid item xs={12}>
              <Box sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1, mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                  >
                    Upload Receipt
                    <input
                      type="file"
                      hidden
                      accept=".jpg,.jpeg,.png,.gif,.pdf"
                      onChange={handleReceiptChange}
                    />
                  </Button>
                  
                  {receiptName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {receiptName}
                      </Typography>
                      <IconButton size="small" onClick={clearReceipt}>
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Supported file types: JPG, PNG, GIF, PDF (Max 5MB)
                </Typography>
              </Box>
            </Grid>
            
            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                multiline
                rows={4}
              />
            </Grid>
          </Grid>
          
          {/* Form Actions */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default ExpenseEntryForm;