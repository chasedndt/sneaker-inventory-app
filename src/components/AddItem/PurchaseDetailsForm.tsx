// src/components/AddItem/PurchaseDetailsForm.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';

interface PurchaseDetailsFormData {
  purchasePrice: string;
  purchaseCurrency: string;
  shippingPrice: string;
  shippingCurrency: string;
  marketPrice: string;
  purchaseDate: Dayjs | null;
  purchaseLocation: string;
  condition: string;
  notes: string;
  orderID: string;
  tags: string[];
  taxType: 'none' | 'vat' | 'salesTax';
  vatPercentage: string;
  salesTaxPercentage: string;
}

interface PurchaseDetailsFormProps {
  formData: PurchaseDetailsFormData;
  onChange: (field: keyof PurchaseDetailsFormData, value: any) => void;
  errors: Partial<Record<keyof PurchaseDetailsFormData, string>>;
}

const currencies = ['£', '$', '€', '¥'];

const conditions = [
  'New with tags',
  'New without tags',
  'Used - Excellent',
  'Used - Good',
  'Used - Fair'
];

const PurchaseDetailsForm: React.FC<PurchaseDetailsFormProps> = ({
  formData,
  onChange,
  errors
}) => {
  const [tagInput, setTagInput] = useState('');

  const handleTagKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      onChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const calculateTax = () => {
    if (!formData.purchasePrice) return 'NaN';
    const price = parseFloat(formData.purchasePrice);
    
    if (formData.taxType === 'vat' && formData.vatPercentage) {
      const vat = parseFloat(formData.vatPercentage);
      return ((price * vat) / 100).toFixed(2);
    }
    
    if (formData.taxType === 'salesTax' && formData.salesTaxPercentage) {
      const salesTax = parseFloat(formData.salesTaxPercentage);
      return ((price * salesTax) / 100).toFixed(2);
    }

    return '0.00';
  };

  const TaxSection = () => {
    const handleTaxTypeChange = (type: 'none' | 'vat' | 'salesTax') => {
      onChange('taxType', type);
      // Reset the percentages when switching tax types
      if (type === 'vat') {
        onChange('salesTaxPercentage', '');
      } else if (type === 'salesTax') {
        onChange('vatPercentage', '');
      } else {
        onChange('vatPercentage', '');
        onChange('salesTaxPercentage', '');
      }
    };

    return (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={formData.taxType === 'vat' ? 'contained' : 'outlined'}
            onClick={() => handleTaxTypeChange(formData.taxType === 'vat' ? 'none' : 'vat')}
          >
            Use VAT
          </Button>
          <Button
            variant={formData.taxType === 'salesTax' ? 'contained' : 'outlined'}
            onClick={() => handleTaxTypeChange(formData.taxType === 'salesTax' ? 'none' : 'salesTax')}
          >
            Use Sales Tax
          </Button>
        </Box>
        
        {formData.taxType === 'vat' && (
          <TextField
            fullWidth
            label="VAT (%)"
            type="number"
            value={formData.vatPercentage}
            onChange={(e) => onChange('vatPercentage', e.target.value)}
            error={!!errors.vatPercentage}
            helperText={errors.vatPercentage}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    VAT = {formData.purchaseCurrency}{calculateTax()}
                  </Typography>
                </InputAdornment>
              )
            }}
          />
        )}
        
        {formData.taxType === 'salesTax' && (
          <TextField
            fullWidth
            label="Sales Tax (%)"
            type="number"
            value={formData.salesTaxPercentage}
            onChange={(e) => onChange('salesTaxPercentage', e.target.value)}
            error={!!errors.salesTaxPercentage}
            helperText={errors.salesTaxPercentage}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    Tax = {formData.purchaseCurrency}{calculateTax()}
                  </Typography>
                </InputAdornment>
              )
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {/* Place of Purchase */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Place of Purchase *"
            value={formData.purchaseLocation}
            onChange={(e) => onChange('purchaseLocation', e.target.value)}
            error={!!errors.purchaseLocation}
            helperText={errors.purchaseLocation}
          />
        </Grid>

        {/* Purchase Price */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl sx={{ width: 100 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.purchaseCurrency}
                label="Currency"
                onChange={(e: SelectChangeEvent) => onChange('purchaseCurrency', e.target.value)}
              >
                {currencies.map((currency) => (
                  <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Purchase Price *"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => onChange('purchasePrice', e.target.value)}
              error={!!errors.purchasePrice}
              helperText={errors.purchasePrice}
            />
          </Box>
        </Grid>

        {/* Shipping Price */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl sx={{ width: 100 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.shippingCurrency}
                label="Currency"
                onChange={(e: SelectChangeEvent) => onChange('shippingCurrency', e.target.value)}
              >
                {currencies.map((currency) => (
                  <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Shipping Price"
              type="number"
              value={formData.shippingPrice}
              onChange={(e) => onChange('shippingPrice', e.target.value)}
              error={!!errors.shippingPrice}
              helperText={errors.shippingPrice}
            />
          </Box>
        </Grid>

        {/* Tax Section */}
        <Grid item xs={12}>
          <TaxSection />
        </Grid>

        {/* Date of Purchase */}
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Purchase Date *"
              value={formData.purchaseDate}
              onChange={(newValue) => onChange('purchaseDate', newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.purchaseDate,
                  helperText: errors.purchaseDate
                }
              }}
            />
          </LocalizationProvider>
        </Grid>

        {/* Order ID */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Order ID"
            value={formData.orderID}
            onChange={(e) => onChange('orderID', e.target.value)}
          />
        </Grid>

        {/* Condition */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.condition}>
            <InputLabel>Condition *</InputLabel>
            <Select
              value={formData.condition}
              label="Condition *"
              onChange={(e) => onChange('condition', e.target.value)}
            >
              {conditions.map((condition) => (
                <MenuItem key={condition} value={condition}>
                  {condition}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Tags */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            placeholder="Press enter to add tags"
            InputProps={{
              endAdornment: (
                <Button
                  variant="contained"
                  size="small"
                  sx={{ ml: 1 }}
                >
                  View
                </Button>
              )
            }}
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder="Add any additional notes about the item..."
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PurchaseDetailsForm;
