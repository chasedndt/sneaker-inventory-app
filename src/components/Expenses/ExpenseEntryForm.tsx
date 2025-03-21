// src/components/Expenses/ExpenseEntryForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  InputAdornment,
  Chip,
  IconButton,
  useTheme,
  FormHelperText,
  SelectChangeEvent,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';

import { expensesApi } from '../../services/expensesApi';
import { Expense, ExpenseFormData, RecurrencePeriod } from '../../models/expenses';

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
  isEditing = false
}) => {
  const theme = useTheme();
  
  // State for expense types dropdown options
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  
  // Form data state
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseType: '',
    amount: '',
    currency: '$',
    expenseDate: dayjs(),
    vendor: '',
    notes: '',
    isRecurring: false,
    recurrencePeriod: 'none'
  });
  
  // Selected receipt file state
  const [selectedReceipt, setSelectedReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptFilename, setExistingReceiptFilename] = useState<string | null>(null);
  
  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Fetch expense types on component mount
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      setLoading(true);
      try {
        const types = await expensesApi.getExpenseTypes();
        setExpenseTypes(types);
      } catch (error) {
        console.error('Error fetching expense types:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExpenseTypes();
  }, []);
  
  // Initialize form with initial expense data if editing
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
        recurrencePeriod: initialExpense.recurrencePeriod || 'none'
      });
      
      if (initialExpense.receiptFilename) {
        setExistingReceiptFilename(initialExpense.receiptFilename);
      }
    }
  }, [initialExpense]);
  
  // Handle form field changes
  const handleChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear any error for the field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Handle receipt file selection
  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedReceipt(file);
      
      // Create a preview URL for image files
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setReceiptPreview(previewUrl);
      } else {
        setReceiptPreview(null);
      }
      
      // Clear any receipt error
      if (errors.receipt) {
        setErrors(prev => ({
          ...prev,
          receipt: ''
        }));
      }
    }
  };
  
  // Handle removing the receipt
  const handleRemoveReceipt = () => {
    setSelectedReceipt(null);
    setReceiptPreview(null);
    setExistingReceiptFilename(null);
    
    // Reset the file input
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.expenseType) {
      newErrors.expenseType = 'Expense type is required';
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Date is required';
    }
    
    if (formData.isRecurring && formData.recurrencePeriod === 'none') {
      newErrors.recurrencePeriod = 'Please select a recurrence period';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Prepare the expense data
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };
      
      // Add receipt if selected
      if (selectedReceipt) {
        expenseData.receipt = selectedReceipt;
      }
      
      let result;
      if (isEditing && initialExpense) {
        // Update existing expense
        result = await expensesApi.updateExpense(initialExpense.id, expenseData);
      } else {
        // Create new expense
        result = await expensesApi.createExpense(expenseData);
      }
      
      // Call the onSave callback with the result
      onSave(result);
    } catch (error: any) {
      console.error('Error submitting expense:', error);
      setSubmitError(`Failed to save expense: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Clean up objects URLs when component unmounts
  useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);
  
  return (
    <Paper sx={{ 
      p: 3, 
      borderRadius: 2,
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[3]
    }}>
      <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>
        {isEditing ? 'Edit Expense' : 'Add New Expense'}
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Expense Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.expenseType}>
                <InputLabel>Expense Type *</InputLabel>
                <Select
                  value={formData.expenseType}
                  label="Expense Type *"
                  onChange={(e: SelectChangeEvent) => handleChange('expenseType', e.target.value)}
                >
                  {expenseTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
                {errors.expenseType && <FormHelperText>{errors.expenseType}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {/* Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount *"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                error={!!errors.amount}
                helperText={errors.amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Select
                        value={formData.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        sx={{ width: 50 }}
                        variant="standard"
                      >
                        <MenuItem value="$">$</MenuItem>
                        <MenuItem value="€">€</MenuItem>
                        <MenuItem value="£">£</MenuItem>
                        <MenuItem value="¥">¥</MenuItem>
                      </Select>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            {/* Date */}
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date *"
                  value={formData.expenseDate}
                  onChange={(newValue) => handleChange('expenseDate', newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.expenseDate,
                      helperText: errors.expenseDate
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            {/* Vendor */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vendor/Payee"
                value={formData.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
              />
            </Grid>
            
            {/* Recurring Expense */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRecurring}
                      onChange={(e) => handleChange('isRecurring', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Recurring Expense"
                />
                
                {formData.isRecurring && (
                  <FormControl sx={{ minWidth: 200 }} error={!!errors.recurrencePeriod}>
                    <InputLabel>Recurrence Period</InputLabel>
                    <Select
                      value={formData.recurrencePeriod}
                      label="Recurrence Period"
                      onChange={(e) => handleChange('recurrencePeriod', e.target.value)}
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="annually">Annually</MenuItem>
                    </Select>
                    {errors.recurrencePeriod && <FormHelperText>{errors.recurrencePeriod}</FormHelperText>}
                  </FormControl>
                )}
              </Box>
            </Grid>
            
            {/* Receipt Upload */}
            <Grid item xs={12}>
              <Box sx={{ 
                border: `1px dashed ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                borderRadius: 1,
                p: 2,
                position: 'relative'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: 1
                }}>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleReceiptChange}
                  />
                  
                  {!selectedReceipt && !existingReceiptFilename ? (
                    <label htmlFor="receipt-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<AttachFileIcon />}
                        sx={{ mb: 1 }}
                      >
                        Upload Receipt
                      </Button>
                    </label>
                  ) : (
                    <Box sx={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        maxWidth: '80%'
                      }}>
                        {receiptPreview ? (
                          <Box
                            component="img"
                            src={receiptPreview}
                            sx={{
                              height: 60,
                              width: 60,
                              borderRadius: 1,
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <DescriptionIcon 
                            sx={{ 
                              color: theme.palette.primary.main,
                              fontSize: 40
                            }} 
                          />
                        )}
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            wordBreak: 'break-all',
                            color: theme.palette.text.secondary
                          }}
                        >
                          {selectedReceipt ? selectedReceipt.name : existingReceiptFilename}
                        </Typography>
                      </Box>
                      
                      <IconButton 
                        onClick={handleRemoveReceipt} 
                        size="small"
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary">
                    Supported file types: JPG, PNG, GIF, PDF (Max 5MB)
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={4}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any additional notes about this expense..."
              />
            </Grid>
          </Grid>
          
          {/* Error message if submit fails */}
          {submitError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {submitError}
            </Alert>
          )}
          
          {/* Form buttons */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            mt: 3,
            gap: 2
          }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              startIcon={<CancelIcon />}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
            </Button>
          </Box>
        </form>
      )}
    </Paper>
  );
};

export default ExpenseEntryForm;