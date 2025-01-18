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
import CloseIcon from '@mui/icons-material/Close';

// Type Definitions
export type CategoryType = 'Sneakers' | 'Streetwear';

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

// Constants
const sizeSystems: Record<CategoryType, string[]> = {
  'Sneakers': ['EU', 'US', 'UK', 'KR', 'CM'],
  'Streetwear': ['EU', 'US']
};

const sizes: Record<CategoryType, Record<string, string[]>> = {
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

  const handleSizeSystemChange = (system: string) => {
    onChange({
      sizeSystem: system,
      selectedSizes: []
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

  const handleCustomSizeAdd = () => {
    if (customSize) {
      handleSizeClick(customSize);
      setCustomSize('');
      setIsCustomSizeDialogOpen(false);
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    const newSizes = [...formData.selectedSizes];
    newSizes[index].quantity = value;
    onChange({
      ...formData,
      selectedSizes: newSizes
    });
  };

  const handleRemoveSize = (index: number) => {
    const newSizes = formData.selectedSizes.filter((_, i) => i !== index);
    onChange({
      ...formData,
      selectedSizes: newSizes
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.sizeSystem}>
        <InputLabel>Size System</InputLabel>
        <Select
          value={formData.sizeSystem}
          label="Size System"
          onChange={(e: SelectChangeEvent) => handleSizeSystemChange(e.target.value)}
        >
          {sizeSystems[category]?.map((system) => (
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
            {sizes[category]?.[formData.sizeSystem]?.map((size) => (
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
            ))}
          </Grid>
        </>
      )}

      {formData.selectedSizes.length > 0 && (
        <Box sx={{ mt: 3 }}>
          {formData.selectedSizes.map((entry, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid item xs={2}>
                <Typography>{entry.system}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography>{entry.size}</Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  type="number"
                  value={entry.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  size="small"
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton onClick={() => handleRemoveSize(index)}>
                  <CloseIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
        </Box>
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
        Add custom size
      </Button>

      <Dialog open={isCustomSizeDialogOpen} onClose={() => setIsCustomSizeDialogOpen(false)}>
        <DialogTitle>Add Custom Size</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Size"
            fullWidth
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCustomSizeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomSizeAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SizesQuantityForm;
