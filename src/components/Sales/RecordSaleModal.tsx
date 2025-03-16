// src/components/Sales/RecordSaleModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
  InputAdornment,
  FormHelperText,
  Alert,
  CircularProgress,
  SelectChangeEvent,
  Avatar
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';

import { Item, api } from '../../services/api';
import { salesApi } from '../../services/salesApi';

interface RecordSaleModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  items: Item[];
}

interface FormData {
  itemId: number;
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

const PLATFORMS = ['StockX', 'GOAT', 'eBay', 'Grailed', 'Depop', 'Stadium Goods', 'Other'];
const CURRENCIES = ['$', '€', '£', '¥'];

const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  open,
  onClose,
  items
}) => {
  const [formData, setFormData] = useState<FormData>({
    itemId: 0,
    platform: '',
    saleDate: dayjs(),
    salePrice: '',
    currency: '$',
    salesTax: '',
    platformFees: '',
    status: 'pending',
    saleId: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        itemId: items.length > 0 ? items[0].id : 0,
        platform: '',
        saleDate: dayjs(),
        salePrice: '',
        currency: '$',
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
  }, [open, items]);
  
  // Update selected item when itemId changes
  useEffect(() => {
    const item = items.find(item => item.id === formData.itemId);
    setSelectedItem(item || null);
  }, [formData.itemId, items]);
  
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
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.itemId) {
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
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Prepare sale data for submission
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
      
      // Record the sale
      await salesApi.recordSale(saleData);
      
      // Update the item status to "sold" in inventory
      await api.updateItemField(formData.itemId, 'status', 'sold');
      
      // Close modal and trigger refresh
      onClose(true);
    } catch (error: any) {
      console.error('Error recording sale:', error);
      setSubmitError(`Failed to record sale: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
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
        <Typography variant="h6">Record Sale</Typography>
        <IconButton
          aria-label="close"
          onClick={() => onClose(false)}
          sx={{ color: 'grey.500' }}
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
                bgcolor: 'background.default', 
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {selectedItem.productName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedItem.brand} • {selectedItem.category} • {selectedItem.size || 'No size'}
                  </Typography>
                  <Typography variant="body2" color="primary">
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
                    value={formData.itemId}
                    onChange={(e: SelectChangeEvent<number>) => 
                      handleChange('itemId', e.target.value as number)
                    }
                    label="Select Item"
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
                  <InputLabel>Listing Platform</InputLabel>
                  <Select
                    value={formData.platform}
                    onChange={(e) => handleChange('platform', e.target.value)}
                    label="Listing Platform"
                  >
                    {PLATFORMS.map((platform) => (
                      <MenuItem key={platform} value={platform}>
                        {platform}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.platform && <FormHelperText>{errors.platform}</FormHelperText>}
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
                        helperText: errors.saleDate
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
                          {CURRENCIES.map((currency) => (
                            <MenuItem key={currency} value={currency}>
                              {currency}
                            </MenuItem>
                          ))}
                        </Select>
                      </InputAdornment>
                    )
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
                        {formData.currency}
                      </InputAdornment>
                    )
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
                        {formData.currency}
                      </InputAdornment>
                    )
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
                />
              </Grid>
              
              {/* Profit Preview */}
              {selectedItem && formData.salePrice && (
                <Grid item xs={12}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'background.default', 
                    borderRadius: 2,
                    mt: 2
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Profit Preview
                    </Typography>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Sale Price:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" align="right">
                          {formData.currency}{formData.salePrice}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Purchase Price:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" align="right">
                          -${selectedItem.purchasePrice.toFixed(2)}
                        </Typography>
                      </Grid>
                      
                      {formData.salesTax && parseFloat(formData.salesTax) > 0 && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Sales Tax/VAT:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" align="right">
                              -{formData.currency}{parseFloat(formData.salesTax).toFixed(2)}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      
                      {formData.platformFees && parseFloat(formData.platformFees) > 0 && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Platform Fees:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" align="right">
                              -{formData.currency}{parseFloat(formData.platformFees).toFixed(2)}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      
                      <Grid item xs={12}>
                        <Box sx={{ my: 1, border: '1px solid', borderColor: 'divider' }} />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
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
                              color={profit >= 0 ? 'success.main' : 'error.main'}
                            >
                              {formData.currency}{profit.toFixed(2)} ({roi.toFixed(1)}% ROI)
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