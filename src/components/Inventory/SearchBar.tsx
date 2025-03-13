// src/components/Inventory/SearchBar.tsx
import React from 'react';
import { 
  TextField, 
  InputAdornment, 
  IconButton,
  Paper,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  const theme = useTheme();
  
  const handleClear = () => {
    onChange('');
  };
  
  return (
    <TextField
      fullWidth
      placeholder="Search by product name, category, or SKU..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton 
              size="small" 
              onClick={handleClear}
              edge="end"
              aria-label="clear search"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
        sx: {
          borderRadius: 1,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.02)',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.04)',
          }
        }
      }}
    />
  );
};

export default SearchBar;