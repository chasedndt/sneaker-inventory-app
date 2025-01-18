// src/components/AddItem/ProductDetailsForm.tsx
import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Grid
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';

// Interface for form data
interface ProductDetailsFormData {
  category: string;
  productName: string;
  reference: string;
  colorway: string;
  brand: string;
}

interface ProductDetailsFormProps {
  formData: ProductDetailsFormData;
  onChange: (field: keyof ProductDetailsFormData, value: string) => void;
  errors: Partial<Record<keyof ProductDetailsFormData, string>>;
}

// Mock categories - replace with API data later
const categories = [
  'Sneakers',
  'Clothing',
  'Accessories',
  'Electronics',
  'Other'
];

const ProductDetailsForm: React.FC<ProductDetailsFormProps> = ({
  formData,
  onChange,
  errors
}) => {
  const handleSelectChange = (event: SelectChangeEvent) => {
    onChange('category', event.target.value);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {/* Category Selection */}
        <Grid item xs={12}>
          <FormControl 
            fullWidth 
            error={!!errors.category}
          >
            <InputLabel id="category-label">Category *</InputLabel>
            <Select
              labelId="category-label"
              value={formData.category}
              label="Category *"
              onChange={handleSelectChange}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
            {errors.category && (
              <FormHelperText>{errors.category}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Product Name */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Product Name *"
            value={formData.productName}
            onChange={(e) => onChange('productName', e.target.value)}
            error={!!errors.productName}
            helperText={errors.productName}
            placeholder="e.g., Air Jordan 1 High"
          />
        </Grid>

        {/* Reference/SKU */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Reference/SKU"
            value={formData.reference}
            onChange={(e) => onChange('reference', e.target.value)}
            error={!!errors.reference}
            helperText={errors.reference}
            placeholder="e.g., 555088-134"
          />
        </Grid>

        {/* Colorway */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Colorway"
            value={formData.colorway}
            onChange={(e) => onChange('colorway', e.target.value)}
            error={!!errors.colorway}
            helperText={errors.colorway}
            placeholder="e.g., University Blue/White"
          />
        </Grid>

        {/* Brand */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Brand *"
            value={formData.brand}
            onChange={(e) => onChange('brand', e.target.value)}
            error={!!errors.brand}
            helperText={errors.brand}
            placeholder="e.g., Nike"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductDetailsForm;
