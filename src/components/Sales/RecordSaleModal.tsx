// src/components/Sales/RecordSaleModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Autocomplete,
  FormHelperText,
  Alert,
  Box,
  IconButton,
  Avatar,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import { Item } from '../../services/api';
import { salesApi } from '../../services/salesApi';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useTheme } from '@mui/material/styles';

// Common platforms for autocomplete
const PREDEFINED_PLATFORMS = [
  'eBay', 'StockX', 'GOAT', 'Depop', 'Vinted', 'Facebook Marketplace', 
  'Grailed', 'Instagram', 'WhatsApp', 'In Person', 'Consignment Store', 'Other'
];

// Currency options with symbols for display
const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

interface RecordSaleModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  items: Item[];
}

interface FormData {
  itemId: number | string; // Support both number and string for Firebase compatibility
  platform: string;
  saleDate: Dayjs | null;
  salePrice: string;
  currency: string;
  salesTax: string;
  platformFees: string;
  status: 'pending' | 'needsShipping' | 'completed';
  saleId: string;
}

interface FormErrors {
  itemId?: string;
  platform?: string;
  saleDate?: string;
  salePrice?: string;
  salesTax?: string;
  platformFees?: string;
}

const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  open,
  onClose,
  items
}) => {
  const theme = useTheme();
  const { authReady } = useAuthReady();
  const { currentUser } = useAuth();
  const { currency: userCurrency } = useSettings(); // Get user's preferred currency
  
  const [formData, setFormData] = useState<FormData>({
    itemId: items.length > 0 ? items[0].id : 0,
    platform: '',
    saleDate: dayjs(),
    salePrice: '',
    currency: userCurrency || 'USD', // Use user's currency setting or default to USD
    salesTax: '',
    platformFees: '',
    status: 'pending',
    saleId: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Custom platform state
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);
  const [platformOptions, setPlatformOptions] = useState<string[]>(PREDEFINED_PLATFORMS);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      // Load any saved custom platforms from localStorage with user-specific key
      const userKey = currentUser ? `customPlatforms_${currentUser.uid}` : 'customPlatforms';
      const savedCustomPlatforms = localStorage.getItem(userKey);
      
      if (savedCustomPlatforms) {
        try {
          const parsedPlatforms = JSON.parse(savedCustomPlatforms);
          setCustomPlatforms(parsedPlatforms);
          setPlatformOptions([...PREDEFINED_PLATFORMS, ...parsedPlatforms]);
        } catch (e) {
          console.error('Error parsing custom platforms:', e);
        }
      }
      
      setFormData({
        itemId: items.length > 0 ? items[0].id : 0,
        platform: '',
        saleDate: dayjs(),
        salePrice: '',
        currency: userCurrency || 'USD', // Use user's currency setting
        salesTax: '',
        platformFees: '',
        status: 'pending',
        saleId: ''
      });
      setErrors({});
      setSubmitError(null);
      
      // Set selected item to first item if available
      if (items.length > 0) {
        setSelectedItem(items[0]);
      }
    }
  }, [open, items, currentUser, userCurrency]);

  // Update selected item when itemId changes
  useEffect(() => {
    const item = items.find(item => {
      // Handle both string and number IDs
      if (typeof formData.itemId === 'string') {
        return String(item.id) === formData.itemId;
      } else {
        return item.id === formData.itemId;
      }
    });
    setSelectedItem(item || null);
  }, [formData.itemId, items]);

  // Get currency symbol for display
  const getCurrencySymbol = (currencyCode: string): string => {
    const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for the field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  
  // Handle platform change with custom input support
  const handlePlatformChange = (event: React.SyntheticEvent, newValue: string | null) => {
    if (!newValue) {
      handleChange('platform', '');
      return;
    }
    
    // Handle custom platform - ensure the value is a string
    const platformValue = newValue.toString().trim();
    
    if (platformValue && !PREDEFINED_PLATFORMS.includes(platformValue) && !customPlatforms.includes(platformValue)) {
      // Add to custom platforms
      const updatedCustomPlatforms = [...customPlatforms, platformValue];
      setCustomPlatforms(updatedCustomPlatforms);
      setPlatformOptions([...PREDEFINED_PLATFORMS, ...updatedCustomPlatforms]);
      
      // Save to localStorage with user-specific key
      const userKey = currentUser ? `customPlatforms_${currentUser.uid}` : 'customPlatforms';
      localStorage.setItem(userKey, JSON.stringify(updatedCustomPlatforms));
    }
    
    handleChange('platform', platformValue);
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.itemId || formData.itemId === '' || formData.itemId === 0) {
      newErrors.itemId = 'Please select an item';
    }
    // For Firebase string IDs, check if it's a valid non-empty string
    if (typeof formData.itemId === 'string' && formData.itemId.trim() === '') {
      newErrors.itemId = 'Please select an item';
    }
    
    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }
    
    if (!formData.saleDate) {
      newErrors.saleDate = 'Sale date is required';
    }
    
    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) {
      newErrors.salePrice = 'Valid sale price is required';
    }
    
    if (formData.salesTax && parseFloat(formData.salesTax) < 0) {
      newErrors.salesTax = 'Sales tax cannot be negative';
    }
    
    if (formData.platformFees && parseFloat(formData.platformFees) < 0) {
      newErrors.platformFees = 'Platform fees cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!currentUser) {
      setSubmitError('Authentication required. Please log in to record a sale.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Use the itemId as-is (works for both string and number IDs)
      const saleData = {
        itemId: formData.itemId,
        platform: formData.platform,
        saleDate: formData.saleDate?.toISOString() || new Date().toISOString(),
        salePrice: parseFloat(formData.salePrice),
        currency: formData.currency,
        salesTax: formData.salesTax ? parseFloat(formData.salesTax) : 0,
        platformFees: formData.platformFees ? parseFloat(formData.platformFees) : 0,
        status: formData.status,
        saleId: formData.saleId || undefined
      };
      
      // Record the sale (backend will automatically update item status to 'sold')
      await salesApi.recordSale(saleData);
      
      // Close modal and trigger refresh
      onClose(true);
    } catch (error: any) {
      console.error('Error recording sale:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSubmitError('Authentication error: Please log in again to continue.');
      } else {
        setSubmitError(`Failed to record sale: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show authentication message if not authenticated
  if (authReady && !currentUser) {
    return (
      <Dialog
        open={open}
        onClose={() => onClose(false)}
        maxWidth="md"
      >
        <DialogTitle>Authentication Required</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You need to be logged in to record sales. Please log in and try again.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  // Show loading state while checking authentication
  if (!authReady) {
    return (
      <Dialog
        open={open}
        onClose={() => onClose(false)}
        maxWidth="md"
      >
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.background.paper
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Typography variant="h6" color={theme.palette.text.primary}>Record Sale</Typography>
        <IconButton
          aria-label="close"
          onClick={() => onClose(false)}
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {items.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No items available to mark as sold. Please add items to your inventory first.
          </Alert>
        ) : (
          <>
            {/* Display selected item details */}
            {selectedItem && (
              <Box sx={{ 
                mb: 3, 
                p: 2, 
                bgcolor: theme.palette.background.default, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Avatar 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.productName}
                  variant="rounded"
                  sx={{ width: 64, height: 64 }}
                />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                    {selectedItem.productName}
                  </Typography>
                  <Typography variant="body2" color={theme.palette.text.secondary}>
                    {selectedItem.brand} • {selectedItem.category} • {selectedItem.size || 'No size'}
                  </Typography>
                  <Typography variant="body2" color={theme.palette.primary.main}>
                    Purchase price: ${selectedItem.purchasePrice.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
            
            <Grid container spacing={3}>
              {/* Item Selector */}
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.itemId}>
                  <InputLabel>Select Item</InputLabel>
                  <Select
                    value={formData.itemId === '' ? '' : formData.itemId}
                    onChange={(e: SelectChangeEvent<number | string>) => 
                      handleChange('itemId', e.target.value)
                    }
                    label="Select Item"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    {items.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.productName} - {item.brand} {item.size ? `(${item.size})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.itemId && <FormHelperText>{errors.itemId}</FormHelperText>}
                </FormControl>
              </Grid>
              
              {/* Platform */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.platform}>
                  <TextField
                    fullWidth
                    label="Platform"
                    value={formData.platform}
                    onChange={(e) => handleChange('platform', e.target.value)}
                    error={!!errors.platform}
                    helperText={errors.platform}
                    placeholder="Enter platform name"
                    sx={{
                      '& .MuiInputBase-input': {
                        color: theme.palette.text.primary
                      }
                    }}
                  />
                </FormControl>
              </Grid>
              
              {/* Sale Date */}
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Sale Date"
                    value={formData.saleDate}
                    onChange={(newValue) => handleChange('saleDate', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.saleDate,
                        helperText: errors.saleDate,
                        sx: {
                          '& .MuiInputBase-input': { 
                            color: theme.palette.text.primary 
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              {/* Sale Price */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sale Price"
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => handleChange('salePrice', e.target.value)}
                  error={!!errors.salePrice}
                  helperText={errors.salePrice}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Select
                          value={formData.currency}
                          onChange={(e) => handleChange('currency', e.target.value)}
                          sx={{ width: 60 }}
                          variant="standard"
                        >
                          {CURRENCY_OPTIONS.map((currency) => (
                            <MenuItem key={currency.code} value={currency.code}>
                              {currency.symbol} {currency.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </InputAdornment>
                    )
                  }}
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      color: theme.palette.text.primary 
                    }
                  }}
                />
              </Grid>
              
              {/* Sales Tax */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sales Tax/VAT"
                  type="number"
                  value={formData.salesTax}
                  onChange={(e) => handleChange('salesTax', e.target.value)}
                  error={!!errors.salesTax}
                  helperText={errors.salesTax}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {getCurrencySymbol(formData.currency)}
                      </InputAdornment>
                    )
                  }}
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      color: theme.palette.text.primary 
                    }
                  }}
                />
              </Grid>
              
              {/* Platform Fees */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Platform Fees"
                  type="number"
                  value={formData.platformFees}
                  onChange={(e) => handleChange('platformFees', e.target.value)}
                  error={!!errors.platformFees}
                  helperText={errors.platformFees}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {getCurrencySymbol(formData.currency)}
                      </InputAdornment>
                    )
                  }}
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      color: theme.palette.text.primary 
                    }
                  }}
                />
              </Grid>
              
              {/* Status */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    label="Status"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="needsShipping">Needs Shipping</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Sale ID */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sale ID (Optional)"
                  value={formData.saleId}
                  onChange={(e) => handleChange('saleId', e.target.value)}
                  placeholder="Order # or reference ID"
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      color: theme.palette.text.primary 
                    }
                  }}
                />
              </Grid>
              
              {/* Profit Preview */}
              {selectedItem && formData.salePrice && (
                <Grid item xs={12}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.background.default, 
                    borderRadius: 2,
                    mt: 2
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: theme.palette.text.primary }}>
                      Profit Preview
                    </Typography>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color={theme.palette.text.secondary}>
                          Sale Price:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" align="right" color={theme.palette.text.primary}>
                          {getCurrencySymbol(formData.currency)}{formData.salePrice}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color={theme.palette.text.secondary}>
                          Purchase Price:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" align="right" color={theme.palette.text.primary}>
                          -${selectedItem.purchasePrice.toFixed(2)}
                        </Typography>
                      </Grid>
                      
                      {formData.salesTax && parseFloat(formData.salesTax) > 0 && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color={theme.palette.text.secondary}>
                              Sales Tax/VAT:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" align="right" color={theme.palette.text.primary}>
                              -{getCurrencySymbol(formData.currency)}{parseFloat(formData.salesTax).toFixed(2)}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      
                      {formData.platformFees && parseFloat(formData.platformFees) > 0 && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color={theme.palette.text.secondary}>
                              Platform Fees:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" align="right" color={theme.palette.text.primary}>
                              -{getCurrencySymbol(formData.currency)}{parseFloat(formData.platformFees).toFixed(2)}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      
                      <Grid item xs={12}>
                        <Box sx={{ my: 1, border: '1px solid', borderColor: 'divider' }} />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color={theme.palette.text.primary}>
                          Net Profit:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        {(() => {
                          const salePrice = parseFloat(formData.salePrice) || 0;
                          const salesTax = parseFloat(formData.salesTax) || 0;
                          const platformFees = parseFloat(formData.platformFees) || 0;
                          const profit = salePrice - selectedItem.purchasePrice - salesTax - platformFees;
                          const roi = (profit / selectedItem.purchasePrice) * 100;
                          
                          return (
                            <Typography 
                              variant="subtitle2" 
                              align="right"
                              color={profit >= 0 ? theme.palette.success.main : theme.palette.error.main}
                            >
                              {getCurrencySymbol(formData.currency)}{profit.toFixed(2)} ({roi.toFixed(1)}% ROI)
                            </Typography>
                          );
                        })()}
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              )}
            </Grid>
          </>
        )}
        
        {submitError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {submitError}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={() => onClose(false)}
          variant="outlined"
          disabled={isSubmitting}
          sx={{
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : undefined,
            color: theme.palette.text.primary
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isSubmitting || items.length === 0}
          startIcon={isSubmitting && <CircularProgress size={24} color="inherit" />}
        >
          {isSubmitting ? 'Recording...' : 'Record Sale'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecordSaleModal;