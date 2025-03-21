// src/components/Expenses/ExpenseFilters.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Switch,
  Typography,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import dayjs, { Dayjs } from 'dayjs';

import { expensesApi } from '../../services/expensesApi';
import { ExpenseFilters as ExpenseFiltersType } from '../../models/expenses';

interface ExpenseFiltersProps {
  onFilterChange: (filters: ExpenseFiltersType) => void;
  initialFilters?: Partial<ExpenseFiltersType>;
  activeFiltersCount: number;
}

const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  onFilterChange,
  initialFilters,
  activeFiltersCount
}) => {
  const theme = useTheme();
  
  // State for expense types dropdown options
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  
  // State for showing/hiding the advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  
  // Filters state
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    startDate: null,
    endDate: null,
    expenseType: '',
    minAmount: '',
    maxAmount: '',
    vendor: '',
    searchQuery: '',
    isRecurring: undefined
  });
  
  // Initialize with provided filters if any
  useEffect(() => {
    if (initialFilters) {
      setFilters(prev => ({
        ...prev,
        ...initialFilters
      }));
      
      // Show advanced filters if any advanced filter is set
      if (
        initialFilters.expenseType ||
        initialFilters.minAmount ||
        initialFilters.maxAmount ||
        initialFilters.vendor ||
        initialFilters.isRecurring !== undefined
      ) {
        setShowAdvancedFilters(true);
      }
    }
  }, [initialFilters]);
  
  // Fetch expense types on component mount
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const types = await expensesApi.getExpenseTypes();
        setExpenseTypes(['', ...types]); // Add empty option for "All"
      } catch (error) {
        console.error('Error fetching expense types:', error);
      }
    };
    
    fetchExpenseTypes();
  }, []);
  
  // Handle filter changes
  const handleFilterChange = (field: keyof ExpenseFiltersType, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Notify parent component about the filter change (with debounce)
    const timeoutId = setTimeout(() => {
      onFilterChange({
        ...filters,
        [field]: value
      });
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };
  
  // Handle clearing all filters
  const handleClearFilters = () => {
    const resetFilters: ExpenseFiltersType = {
      startDate: null,
      endDate: null,
      expenseType: '',
      minAmount: '',
      maxAmount: '',
      vendor: '',
      searchQuery: '',
      isRecurring: undefined
    };
    
    setFilters(resetFilters);
    onFilterChange(resetFilters);
    setShowAdvancedFilters(false);
  };
  
  // Handle clearing a specific filter
  const handleClearFilter = (field: keyof ExpenseFiltersType) => {
    const defaultValue = 
      field === 'startDate' || field === 'endDate' ? null :
      field === 'isRecurring' ? undefined : '';
    
    setFilters(prev => ({
      ...prev,
      [field]: defaultValue
    }));
    
    onFilterChange({
      ...filters,
      [field]: defaultValue
    });
  };
  
  return (
    <Paper sx={{ 
      p: 2, 
      mb: 3, 
      borderRadius: 2,
      bgcolor: theme.palette.background.paper
    }}>
      {/* Basic Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search expenses..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: filters.searchQuery ? (
              <InputAdornment position="end">
                <IconButton 
                  onClick={() => handleClearFilter('searchQuery')}
                  edge="end"
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
      </Box>
      
      {/* Date Range */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={5}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={(newValue) => handleFilterChange('startDate', newValue)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={5}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(newValue) => handleFilterChange('endDate', newValue)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button 
            variant="outlined"
            fullWidth
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            startIcon={<FilterListIcon />}
            sx={{ height: '40px' }}
          >
            {showAdvancedFilters ? 'Hide' : 'Filters'}
            {activeFiltersCount > 0 && !showAdvancedFilters && (
              <Chip 
                label={activeFiltersCount} 
                size="small" 
                color="primary" 
                sx={{ ml: 1, height: '20px', width: '20px', fontSize: '0.7rem' }} 
              />
            )}
          </Button>
        </Grid>
      </Grid>
      
      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.text.secondary }}>
            Advanced Filters
          </Typography>
          <Grid container spacing={2}>
            {/* Expense Type */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Expense Type</InputLabel>
                <Select
                  value={filters.expenseType}
                  label="Expense Type"
                  onChange={(e: SelectChangeEvent) => handleFilterChange('expenseType', e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {expenseTypes.filter(type => type !== '').map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Amount Range */}
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Min Amount"
                  type="number"
                  size="small"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
                <TextField
                  fullWidth
                  label="Max Amount"
                  type="number"
                  size="small"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Box>
            </Grid>
            
            {/* Vendor */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Vendor"
                size="small"
                value={filters.vendor}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
              />
            </Grid>
            
            {/* Recurring Only */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!filters.isRecurring}
                    onChange={(e) => handleFilterChange('isRecurring', e.target.checked ? true : undefined)}
                  />
                }
                label="Recurring Only"
                sx={{ height: '100%', display: 'flex', alignItems: 'center' }}
              />
            </Grid>
            
            {/* Clear Filters Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleClearFilters}
                  size="small"
                >
                  Clear All Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {/* Date Range Filter */}
          {(filters.startDate || filters.endDate) && (
            <Chip
              label={`Date: ${filters.startDate ? dayjs(filters.startDate).format('MM/DD/YYYY') : 'Any'} - ${filters.endDate ? dayjs(filters.endDate).format('MM/DD/YYYY') : 'Any'}`}
              onDelete={() => {
                handleClearFilter('startDate');
                handleClearFilter('endDate');
              }}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          
          {/* Expense Type Filter */}
          {filters.expenseType && (
            <Chip
              label={`Type: ${filters.expenseType}`}
              onDelete={() => handleClearFilter('expenseType')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          
          {/* Amount Range Filter */}
          {(filters.minAmount || filters.maxAmount) && (
            <Chip
              label={`Amount: ${filters.minAmount ? `$${filters.minAmount}` : '$0'} - ${filters.maxAmount ? `$${filters.maxAmount}` : 'Any'}`}
              onDelete={() => {
                handleClearFilter('minAmount');
                handleClearFilter('maxAmount');
              }}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          
          {/* Vendor Filter */}
          {filters.vendor && (
            <Chip
              label={`Vendor: ${filters.vendor}`}
              onDelete={() => handleClearFilter('vendor')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          
          {/* Recurring Filter */}
          {filters.isRecurring !== undefined && (
            <Chip
              label="Recurring Only"
              onDelete={() => handleClearFilter('isRecurring')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          
          {/* Search Query Filter */}
          {filters.searchQuery && (
            <Chip
              label={`Search: ${filters.searchQuery}`}
              onDelete={() => handleClearFilter('searchQuery')}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ExpenseFilters;