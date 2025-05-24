// src/components/AddItem/ProductDetailsForm.tsx
import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent
} from '@mui/material';
import { CategoryType } from './SizesQuantityForm';

interface ProductDetailsFormData {
  category: CategoryType;
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

const categories: CategoryType[] = [
  'Sneakers',
  'Streetwear',
  'Handbags',
  'Watches',
  'Accessories',
  'Electronics',
  'Collectibles',
  'Other'
];

const ProductDetailsForm: React.FC<ProductDetailsFormProps> = ({
  formData,
  onChange,
  errors
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.category}>
            <InputLabel>Category *</InputLabel>
            <Select
              value={formData.category}
              label="Category *"
              onChange={(e: SelectChangeEvent) => onChange('category', e.target.value)}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Product Name *"
            value={formData.productName}
            onChange={(e) => onChange('productName', e.target.value)}
            error={!!errors.productName}
            helperText={errors.productName}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Reference/SKU"
            value={formData.reference}
            onChange={(e) => onChange('reference', e.target.value)}
            error={!!errors.reference}
            helperText={errors.reference}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Colorway"
            value={formData.colorway}
            onChange={(e) => onChange('colorway', e.target.value)}
            error={!!errors.colorway}
            helperText={errors.colorway}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Brand *"
            value={formData.brand}
            onChange={(e) => onChange('brand', e.target.value)}
            error={!!errors.brand}
            helperText={errors.brand}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductDetailsForm;
