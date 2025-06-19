// src/components/Sales/BulkSaleModal.tsx
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Divider,
  Checkbox,
  Tooltip,
  SelectChangeEvent
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import dayjs, { Dayjs } from 'dayjs';

import { SalesItem } from '../../pages/SalesPage';
import { salesApi } from '../../services/salesApi';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useApi } from '../../services/api';

interface BulkSaleModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  sales: SalesItem[];
}

interface SharedFormData {
  platform: string;
  saleDate: Dayjs | null;
  status: 'pending' | 'needsShipping' | 'completed';
  currency: string;
}

interface IndividualFormData {
  salePrice: string;
  salesTax: string;
  platformFees: string;
  saleId: string;
}

interface FormErrors {
  platform?: string;
  saleDate?: string;
  salePrice?: { [key: number]: string };
  salesTax?: { [key: number]: string };
  platformFees?: { [key: number]: string };
}

const PLATFORMS = ['StockX', 'GOAT', 'eBay', 'Grailed', 'Depop', 'Stadium Goods', 'Other'];
const CURRENCIES = ['$', '€', '£', '¥'];

const BulkSaleModal: React.FC<BulkSaleModalProps> = ({
  open,
  onClose,
  sales
}) => {
  const { authReady, currentUser } = useAuthReady();
  
  const [sharedFormData, setSharedFormData] = useState<SharedFormData>({
    platform: '',
    saleDate: dayjs(),
    status: 'pending',
    currency: '$'
  });
  
  const [individualFormData, setIndividualFormData] = useState<{ [key: number]: IndividualFormData }>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [shareAllFields, setShareAllFields] = useState<boolean>(false);
  
  // Reset form when modal opens/closes or when sales change
  useEffect(() => {
    if (open && sales.length > 0) {
      setSharedFormData({
        platform: '',
        saleDate: dayjs(),
        status: 'pending',
        currency: '$'
      });
      
      // Initialize individual form data for each sale item
      const initialFormData: { [key: number]: IndividualFormData } = {};
      sales.forEach(sale => {
        initialFormData[sale.itemId] = {
          salePrice: '',
          salesTax: '',
          platformFees: '',
          saleId: ''
        };
      });
      
      setIndividualFormData(initialFormData);
      setErrors({});
      setSubmitError(null);
      setSelectedItems(sales.map(sale => sale.itemId));
      setShareAllFields(false);
    }
  }, [open, sales]);
  
  const handleChangeShared = (field: keyof SharedFormData, value: any) => {
    setSharedFormData(prev => ({
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
  
  const handleChangeIndividual = (itemId: number, field: keyof IndividualFormData, value: any) => {
    setIndividualFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
    
    // Clear error for the field
    if (errors[field as keyof FormErrors] && errors[field as keyof FormErrors]?.[itemId]) {
      setErrors(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof { salePrice?: { [key: number]: string } }],
          [itemId]: undefined
        }
      }));
    }
  };
  
  // When any individual field changes and shareAllFields is true, update all items
  const firstItemDataFromState = selectedItems.length > 0 ? individualFormData[selectedItems[0]] : undefined;

  useEffect(() => {
    if (shareAllFields && selectedItems.length > 0) {
      const firstItemId = selectedItems[0];
      const firstItemData = firstItemDataFromState;

      if (firstItemData) {
        const newIndividualFormData = { ...individualFormData };
        
        // Apply the values to all selected items
        selectedItems.forEach(itemId => {
          if (itemId !== firstItemId) {
            newIndividualFormData[itemId] = { ...firstItemData };
          }
        });
        
        setIndividualFormData(newIndividualFormData);
      }
    }
  }, [shareAllFields, firstItemDataFromState, selectedItems, individualFormData]);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      salePrice: {},
      salesTax: {},
      platformFees: {}
    };
    let hasErrors = false;
    
    if (!sharedFormData.platform) {
      newErrors.platform = 'Platform is required';
      hasErrors = true;
    }
    
    if (!sharedFormData.saleDate) {
      newErrors.saleDate = 'Sale date is required';
      hasErrors = true;
    }
    
    // Validate individual fields for selected items
    selectedItems.forEach(itemId => {
      const item = individualFormData[itemId];
      
      if (!item.salePrice || parseFloat(item.salePrice) <= 0) {
        newErrors.salePrice![itemId] = 'Valid sale price is required';
        hasErrors = true;
      }
      
      if (item.salesTax && parseFloat(item.salesTax) < 0) {
        newErrors.salesTax![itemId] = 'Sales tax cannot be negative';
        hasErrors = true;
      }
      
      if (item.platformFees && parseFloat(item.platformFees) < 0) {
        newErrors.platformFees![itemId] = 'Platform fees cannot be negative';
        hasErrors = true;
      }
    });
    
    setErrors(newErrors);
    return !hasErrors;
  };
  
  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(sales.map(sale => sale.itemId));
    } else {
      setSelectedItems([]);
    }
  };
  
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!currentUser) {
      setSubmitError('Authentication required. Please log in to update sales.');
      return;
    }
    
    if (!validateForm() || selectedItems.length === 0) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // For each selected item, create a sale record
      const updatePromises = selectedItems.map(itemId => {
        const sale = sales.find(s => s.itemId === itemId);
        const itemFormData = individualFormData[itemId];
        
        if (!sale || !itemFormData) {
          return Promise.reject(new Error(`Invalid data for item ID ${itemId}`));
        }
        
        // Prepare sale data for submission
        const saleData = {
          id: sale.id,
          itemId: itemId,
          platform: sharedFormData.platform,
          saleDate: sharedFormData.saleDate?.toISOString() || new Date().toISOString(),
          salePrice: parseFloat(itemFormData.salePrice),
          currency: sharedFormData.currency,
          salesTax: itemFormData.salesTax ? parseFloat(itemFormData.salesTax) : 0,
          platformFees: itemFormData.platformFees ? parseFloat(itemFormData.platformFees) : 0,
          status: sharedFormData.status,
          saleId: itemFormData.saleId || undefined
        };
        
        // Edit existing sale or create new one
        if (sale.id) {
          return salesApi.updateSale(sale.id, saleData);
        } else {
          return salesApi.recordSale(saleData);
        }
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Close modal and trigger refresh
      onClose(true);
    } catch (error: any) {
      console.error('Error updating sales:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSubmitError('Authentication error: Please log in again to continue.');
      } else {
        setSubmitError(`Failed to update sales: ${error.message}`);
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
            You need to be logged in to update sales. Please log in and try again.
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
      maxWidth="lg"
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
        <Typography variant="h6">
          {selectedItems.length > 1 ? `Bulk Edit ${selectedItems.length} Sales` : 'Edit Sale'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={() => onClose(false)}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {sales.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No items selected for editing.
          </Alert>
        ) : (
          <>
            {/* Shared fields section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Shared Fields
                <Tooltip title="These values will be applied to all selected items">
                  <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              
              <Grid container spacing={3}>
                {/* Platform */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth error={!!errors.platform}>
                    <InputLabel>Listing Platform</InputLabel>
                    <Select
                      value={sharedFormData.platform}
                      onChange={(e) => handleChangeShared('platform', e.target.value)}
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
                <Grid item xs={12} sm={4}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="Sale Date"
                      value={sharedFormData.saleDate}
                      onChange={(newValue) => handleChangeShared('saleDate', newValue)}
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
                
                {/* Status */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={sharedFormData.status}
                      onChange={(e) => handleChangeShared('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="needsShipping">Needs Shipping</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Currency */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={sharedFormData.currency}
                      onChange={(e) => handleChangeShared('currency', e.target.value)}
                      label="Currency"
                    >
                      {CURRENCIES.map((currency) => (
                        <MenuItem key={currency} value={currency}>
                          {currency}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Share all fields option */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Checkbox
                      checked={shareAllFields}
                      onChange={(e) => setShareAllFields(e.target.checked)}
                      color="primary"
                    />
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                      Apply the same price, tax, and fees to all selected items
                      <Tooltip title="When enabled, price, tax, and fees values entered for the first item will be copied to all selected items">
                        <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Individual items section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Individual Items</span>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={selectedItems.length === sales.length}
                    indeterminate={selectedItems.length > 0 && selectedItems.length < sales.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <Typography variant="body2">
                    {selectedItems.length} of {sales.length} selected
                  </Typography>
                </Box>
              </Typography>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedItems.length === sales.length}
                          indeterminate={selectedItems.length > 0 && selectedItems.length < sales.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Sale Price</TableCell>
                      <TableCell>Sales Tax/VAT</TableCell>
                      <TableCell>Platform Fees</TableCell>
                      <TableCell>Sale ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.map((sale) => {
                      const isItemSelected = selectedItems.includes(sale.itemId);
                      const formData = individualFormData[sale.itemId] || {
                        salePrice: '',
                        salesTax: '',
                        platformFees: '',
                        saleId: ''
                      };
                      
                      return (
                        <TableRow key={sale.itemId}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isItemSelected}
                              onChange={(e) => handleSelectItem(sale.itemId, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                src={sale.imageUrl}
                                alt={sale.itemName}
                                variant="rounded"
                                sx={{ width: 40, height: 40 }}
                              />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {sale.itemName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {sale.brand} • {sale.size || 'No size'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={formData.salePrice}
                              onChange={(e) => handleChangeIndividual(sale.itemId, 'salePrice', e.target.value)}
                              disabled={!isItemSelected}
                              error={!!errors.salePrice?.[sale.itemId]}
                              helperText={errors.salePrice?.[sale.itemId]}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    {sharedFormData.currency}
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={formData.salesTax}
                              onChange={(e) => handleChangeIndividual(sale.itemId, 'salesTax', e.target.value)}
                              disabled={!isItemSelected}
                              error={!!errors.salesTax?.[sale.itemId]}
                              helperText={errors.salesTax?.[sale.itemId]}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    {sharedFormData.currency}
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={formData.platformFees}
                              onChange={(e) => handleChangeIndividual(sale.itemId, 'platformFees', e.target.value)}
                              disabled={!isItemSelected}
                              error={!!errors.platformFees?.[sale.itemId]}
                              helperText={errors.platformFees?.[sale.itemId]}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    {sharedFormData.currency}
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={formData.saleId}
                              onChange={(e) => handleChangeIndividual(sale.itemId, 'saleId', e.target.value)}
                              disabled={!isItemSelected}
                              placeholder="Order ID (optional)"
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
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
          disabled={isSubmitting || sales.length === 0 || selectedItems.length === 0}
          startIcon={isSubmitting && <CircularProgress size={24} color="inherit" />}
        >
          {isSubmitting ? 'Saving...' : `Save ${selectedItems.length > 1 ? selectedItems.length + ' Items' : 'Item'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkSaleModal;