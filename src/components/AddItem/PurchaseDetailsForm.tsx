// src/components/AddItem/PurchaseDetailsForm.tsx
import React from 'react';
import {
  Box,
  TextField,
  Grid,
  InputAdornment,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface PurchaseDetailsFormData {
  purchasePrice: string;
  marketPrice: string;
  purchaseDate: Dayjs | null;
  purchaseLocation: string;
  condition: string;
  notes: string;
}

interface PurchaseDetailsFormProps {
  formData: PurchaseDetailsFormData;
  onChange: (field: keyof PurchaseDetailsFormData, value: any) => void;
  errors: Partial<Record<keyof PurchaseDetailsFormData, string>>;
}

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
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {/* Purchase Price */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Purchase Price *"
            type="number"
            value={formData.purchasePrice}
            onChange={(e) => onChange('purchasePrice', e.target.value)}
            error={!!errors.purchasePrice}
            helperText={errors.purchasePrice}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              inputProps: { min: 0, step: "0.01" }
            }}
          />
        </Grid>

        {/* Market Price */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Market Price *"
            type="number"
            value={formData.marketPrice}
            onChange={(e) => onChange('marketPrice', e.target.value)}
            error={!!errors.marketPrice}
            helperText={errors.marketPrice}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              inputProps: { min: 0, step: "0.01" }
            }}
          />
        </Grid>

        {/* Purchase Date */}
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

        {/* Purchase Location */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Purchase Location"
            value={formData.purchaseLocation}
            onChange={(e) => onChange('purchaseLocation', e.target.value)}
            error={!!errors.purchaseLocation}
            helperText={errors.purchaseLocation}
            placeholder="e.g., Nike Store, StockX"
          />
        </Grid>

        {/* Condition */}
        <Grid item xs={12}>
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

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            error={!!errors.notes}
            helperText={errors.notes}
            placeholder="Add any additional notes about the item..."
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PurchaseDetailsForm;
