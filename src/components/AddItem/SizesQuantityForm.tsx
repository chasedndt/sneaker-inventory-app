// src/components/AddItem/SizesQuantityForm.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';

export type CategoryType = 'Sneakers' | 'Streetwear' | 'Handbags' | 'Watches' | 'Accessories' | 'Electronics' | 'Other';

interface SizeEntry {
  system: string;
  size: string;
  quantity: string;
}

interface SizesQuantityFormProps {
  category: CategoryType;
  formData: {
    sizeSystem: string;
    selectedSizes: SizeEntry[];
  };
  onChange: (data: { sizeSystem: string; selectedSizes: SizeEntry[] }) => void;
  errors: {
    sizeSystem?: string;
    sizes?: string;
  };
}

type SizesByCategoryType = {
  Sneakers: Record<string, string[]>;
  Streetwear: Record<string, string[]>;
};

const sizeSystems: Record<CategoryType, string[]> = {
  'Sneakers': ['EU', 'US', 'UK', 'KR', 'CM'],
  'Streetwear': ['EU', 'US'],
  'Handbags': [],
  'Watches': [],
  'Accessories': [],
  'Electronics': [],
  'Other': []
};

const sizes: SizesByCategoryType = {
  Sneakers: {
    EU: ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', 
         '42', '42.5', '43', '44', '44.5', '45', '45.5', '46', '47', '47.5', '48.5', '49.5'],
    US: ['3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', 
         '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'],
    UK: ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', 
         '9', '9.5', '10', '10.5', '11', '12', '13'],
    KR: ['225', '230', '235', '240', '245', '250', '255', '260', '265', '270', 
         '275', '280', '285', '290', '295', '300', '305', '310'],
    CM: ['22.5', '23', '23.5', '24', '24.5', '25', '25.5', '26', '26.5', '27', 
         '27.5', '28', '28.5', '29', '29.5', '30', '30.5', '31']
  },
  Streetwear: {
    EU: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
    US: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
  }
};

const SizesQuantityForm: React.FC<SizesQuantityFormProps> = ({
  category,
  formData,
  onChange,
  errors
}) => {
  const [isCustomSizeDialogOpen, setIsCustomSizeDialogOpen] = useState(false);
  const [customSize, setCustomSize] = useState('');

  const usesSizeSystem = ['Sneakers', 'Streetwear'].includes(category);

  const handleQuantityChange = (index: number, change: number) => {
    const newSizes = [...formData.selectedSizes];
    const currentQuantity = parseInt(newSizes[index]?.quantity || '1');
    const newQuantity = Math.max(1, currentQuantity + change);
    
    if (newSizes[index]) {
      newSizes[index].quantity = newQuantity.toString();
    } else {
      newSizes.push({
        system: '',
        size: '',
        quantity: newQuantity.toString()
      });
    }
    
    onChange({
      ...formData,
      selectedSizes: newSizes
    });
  };

  const handleSizeClick = (size: string) => {
    if (formData.selectedSizes.some(s => s.size === size)) return;
    
    const newEntry: SizeEntry = {
      system: formData.sizeSystem,
      size: size,
      quantity: '1'
    };
    onChange({
      ...formData,
      selectedSizes: [...formData.selectedSizes, newEntry]
    });
  };

  const handleAddCustomSize = () => {
    if (customSize) {
      const newEntry: SizeEntry = {
        system: formData.sizeSystem,
        size: customSize,
        quantity: '1'
      };
      onChange({
        ...formData,
        selectedSizes: [...formData.selectedSizes, newEntry]
      });
      setCustomSize('');
      setIsCustomSizeDialogOpen(false);
    }
  };

  const handleRemoveSize = (index: number) => {
    const newSizes = formData.selectedSizes.filter((_, i) => i !== index);
    onChange({
      ...formData,
      selectedSizes: newSizes
    });
  };

  const renderQuantityOnlyForm = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Select Quantity
      </Typography>

      {formData.selectedSizes.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={() => handleQuantityChange(0, -1)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <RemoveIcon />
          </IconButton>
          <TextField
            value={1}
            size="small"
            sx={{ width: '80px', mx: 2 }}
            InputProps={{ readOnly: true }}
          />
          <IconButton 
            onClick={() => handleQuantityChange(0, 1)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      ) : (
        formData.selectedSizes.map((entry, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              onClick={() => handleQuantityChange(index, -1)}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <RemoveIcon />
            </IconButton>
            <TextField
              value={entry.quantity}
              size="small"
              sx={{ width: '80px', mx: 2 }}
              InputProps={{ readOnly: true }}
            />
            <IconButton 
              onClick={() => handleQuantityChange(index, 1)}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <AddIcon />
            </IconButton>
            {entry.size && (
              <Typography sx={{ ml: 2 }}>{entry.size}</Typography>
            )}
            <IconButton onClick={() => handleRemoveSize(index)} sx={{ ml: 'auto' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        ))
      )}

      <Button
        variant="outlined"
        onClick={() => setIsCustomSizeDialogOpen(true)}
        sx={{ 
          mt: 2,
          borderStyle: 'dashed',
          color: 'text.secondary'
        }}
      >
        Add custom size/type
      </Button>
    </Box>
  );

  return (
    <Box sx={{ mt: 2 }}>
      {usesSizeSystem ? (
        <>
          <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.sizeSystem}>
            <InputLabel>Size System</InputLabel>
            <Select
              value={formData.sizeSystem}
              label="Size System"
              onChange={(e: SelectChangeEvent) => onChange({
                ...formData,
                sizeSystem: e.target.value,
                selectedSizes: []
              })}
            >
              {sizeSystems[category]?.map((system: string) => (
                <MenuItem key={system} value={system}>{system}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {formData.sizeSystem && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Select Sizes
              </Typography>
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {(category === 'Sneakers' || category === 'Streetwear') && formData.sizeSystem && 
                  ((sizes[category as keyof SizesByCategoryType][formData.sizeSystem] || []).map((size: string) => (
                    <Grid item key={size}>
                      <Button
                        variant={formData.selectedSizes.some(s => s.size === size) ? 'contained' : 'outlined'}
                        onClick={() => handleSizeClick(size)}
                        size="small"
                        sx={{
                          minWidth: '60px',
                          borderRadius: 1
                        }}
                      >
                        {size}
                      </Button>
                    </Grid>
                  )))}
              </Grid>
            </>
          )}
        </>
      ) : (
        renderQuantityOnlyForm()
      )}

      <Dialog open={isCustomSizeDialogOpen} onClose={() => setIsCustomSizeDialogOpen(false)}>
        <DialogTitle>Add Custom Size/Type</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Size/Type"
            fullWidth
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCustomSizeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCustomSize}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SizesQuantityForm;
