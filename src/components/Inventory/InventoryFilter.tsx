// src/components/Inventory/InventoryFilter.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Popover,
  Chip,
  Typography,
  Checkbox,
  FormControlLabel,
  useTheme,
  ListSubheader,
  ListItemText,
  Divider,
  Paper,
  Collapse,
  List,
  ListItemButton,
  Badge,
  alpha
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { CategoryType } from '../../components/AddItem/SizesQuantityForm';

// Types for defining available filters
export interface FilterOption {
  id: string;
  label: string;
  type: 'category' | 'status' | 'brand' | 'size';
}

// Type for active filters
export interface ActiveFilter {
  id: string;
  type: string;
  value: string | string[];
  label: string;
}

// Props for the filter component
interface InventoryFilterProps {
  onFilterChange: (filters: ActiveFilter[]) => void;
  activeFilters: ActiveFilter[];
  availableBrands: string[];
}

// All available categories
const CATEGORIES: CategoryType[] = [
  'Sneakers',
  'Streetwear',
  'Handbags',
  'Watches',
  'Accessories',
  'Electronics',
  'Other'
];

// All available status options
const STATUS_OPTIONS = [
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold', label: 'Sold' }
];

// Main filter component
const InventoryFilter: React.FC<InventoryFilterProps> = ({
  onFilterChange,
  activeFilters,
  availableBrands
}) => {
  const theme = useTheme();
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [subMenuAnchor, setSubMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentFilterType, setCurrentFilterType] = useState<string | null>(null);
  
  // List of primary filter options
  const filterOptions: FilterOption[] = [
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'category', label: 'Category', type: 'category' },
    { id: 'brand', label: 'Brand', type: 'brand' }
  ];
  
  // Handle opening the main filter menu
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  
  // Handle closing the main filter menu
  const handleCloseFilterMenu = () => {
    setFilterMenuAnchor(null);
  };
  
  // Open a specific filter's submenu
  const handleOpenSubMenu = (
    event: React.MouseEvent<HTMLElement>,
    filterType: string
  ) => {
    // Prevent the main menu from closing
    event.stopPropagation();
    
    setCurrentFilterType(filterType);
    setSubMenuAnchor(event.currentTarget);
    
    // Don't close the main menu when opening a submenu
    // This allows for a cascading menu effect
  };
  
  // Close the submenu
  const handleCloseSubMenu = () => {
    setSubMenuAnchor(null);
    setCurrentFilterType(null);
  };
  
  // Add or update a filter
  const handleAddFilter = (type: string, value: string) => {
    // Close menus
    handleCloseSubMenu();
    handleCloseFilterMenu();
    
    // Create filter ID
    const filterId = `${type}-${value}`;
    
    // Check if this filter already exists
    const existingFilterIndex = activeFilters.findIndex(
      filter => filter.id === filterId
    );
    
    // If it exists, remove it (toggle behavior)
    if (existingFilterIndex >= 0) {
      const newFilters = [...activeFilters];
      newFilters.splice(existingFilterIndex, 1);
      onFilterChange(newFilters);
      return;
    }
    
    // Create new filter
    let label = value;
    
    // Get more descriptive labels for specific filter types
    if (type === 'status') {
      const statusOption = STATUS_OPTIONS.find(option => option.value === value);
      if (statusOption) {
        label = statusOption.label;
      }
    }
    
    const newFilter: ActiveFilter = {
      id: filterId,
      type,
      value,
      label: `${getFilterTypeLabel(type)}: ${label}`
    };
    
    onFilterChange([...activeFilters, newFilter]);
  };
  
  // Remove a single filter
  const handleRemoveFilter = (filterId: string) => {
    const newFilters = activeFilters.filter(filter => filter.id !== filterId);
    onFilterChange(newFilters);
  };
  
  // Clear all active filters
  const handleClearAllFilters = () => {
    onFilterChange([]);
  };
  
  // Get a human-readable label for filter types
  const getFilterTypeLabel = (type: string): string => {
    const option = filterOptions.find(opt => opt.id === type);
    return option ? option.label : type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  // Check if a specific value is currently active for a filter type
  const isFilterActive = (type: string, value: string): boolean => {
    return activeFilters.some(
      filter => filter.type === type && filter.value === value
    );
  };

  // Render active filter chips
  const renderActiveFilters = () => {
    if (activeFilters.length === 0) {
      return null;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
        {activeFilters.map((filter) => (
          <Chip
            key={filter.id}
            label={filter.label}
            onDelete={() => handleRemoveFilter(filter.id)}
            size="small"
            color="primary"
            sx={{ 
              borderRadius: 1.5,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transform: 'translateY(-1px)'
              }
            }}
          />
        ))}
        
        {activeFilters.length > 1 && (
          <Chip
            label="Clear All"
            onDelete={handleClearAllFilters}
            deleteIcon={<ClearIcon />}
            size="small"
            variant="outlined"
            sx={{ 
              borderRadius: 1.5,
              borderColor: theme.palette.error.main,
              color: theme.palette.error.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.05),
                borderColor: theme.palette.error.main
              },
              '& .MuiChip-deleteIcon': {
                color: theme.palette.error.main
              }
            }}
          />
        )}
      </Box>
    );
  };
  
  // Check if a submenu is currently open
  const isSubMenuOpen = Boolean(subMenuAnchor);
  
  // Calculate submenu position based on parent item
  const getSubMenuPosition = () => {
    if (!subMenuAnchor) return undefined;
    
    return {
      left: subMenuAnchor.getBoundingClientRect().right,
      top: subMenuAnchor.getBoundingClientRect().top,
    };
  };

  return (
    <Box>
      {/* Filter Button */}
      <Button
        variant={activeFilters.length > 0 ? "contained" : "outlined"}
        startIcon={<FilterListIcon />}
        onClick={handleFilterClick}
        aria-haspopup="true"
        aria-expanded={Boolean(filterMenuAnchor) ? 'true' : undefined}
        sx={{
          borderRadius: 1.5,
          textTransform: 'none',
          transition: 'all 0.2s ease',
          mr: 1,
          ...(activeFilters.length > 0 && {
            bgcolor: theme.palette.primary.main,
            color: 'white',
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            },
          }),
          ...(!activeFilters.length && {
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }
          })
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          Filter
          {activeFilters.length > 0 && (
            <Badge
              badgeContent={activeFilters.length}
              color="secondary"
              sx={{ ml: 1 }}
            >
              <Box sx={{ width: 6, height: 6 }} />
            </Badge>
          )}
        </Box>
      </Button>
      
      {/* Render active filter chips */}
      {renderActiveFilters()}
      
      {/* Main Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleCloseFilterMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            boxShadow: theme.shadows[3],
            minWidth: 200,
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              left: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            }
          },
        }}
      >
        <ListSubheader
          sx={{
            bgcolor: 'background.paper',
            lineHeight: '36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2
          }}
        >
          <Typography variant="subtitle2">Filter By</Typography>
          {activeFilters.length > 0 && (
            <Button
              size="small"
              onClick={handleClearAllFilters}
              variant="text"
              color="primary"
            >
              Clear All
            </Button>
          )}
        </ListSubheader>
        <Divider />
        
        {/* Filter options */}
        {filterOptions.map((option) => (
          <MenuItem
            key={option.id}
            onClick={(e) => handleOpenSubMenu(e, option.id)}
            selected={currentFilterType === option.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(0, 0, 0, 0.04)',
              },
              ...(currentFilterType === option.id && {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.06)',
              })
            }}
          >
            <ListItemText primary={option.label} />
            <KeyboardArrowRightIcon fontSize="small" />
          </MenuItem>
        ))}
      </Menu>
      
      {/* Submenu for specific filter options */}
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={getSubMenuPosition()}
        open={isSubMenuOpen}
        onClose={handleCloseSubMenu}
        PaperProps={{
          sx: {
            minWidth: 200,
            borderRadius: 2,
            boxShadow: theme.shadows[3],
          },
        }}
      >
        {currentFilterType === 'category' && (
          <>
            <ListSubheader
              sx={{
                bgcolor: 'background.paper',
                lineHeight: '36px',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2
              }}
            >
              <Typography variant="subtitle2">Select Category</Typography>
            </ListSubheader>
            <Divider />
            {CATEGORIES.map((category) => (
              <MenuItem
                key={category}
                onClick={() => handleAddFilter('category', category)}
                sx={{
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                  ...(isFilterActive('category', category) && {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.primary.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.1),
                  })
                }}
              >
                <Checkbox
                  checked={isFilterActive('category', category)}
                  size="small"
                  edge="start"
                  color="primary"
                  disableRipple
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                />
                <ListItemText primary={category} />
              </MenuItem>
            ))}
          </>
        )}
        
        {currentFilterType === 'status' && (
          <>
            <ListSubheader
              sx={{
                bgcolor: 'background.paper',
                lineHeight: '36px',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2
              }}
            >
              <Typography variant="subtitle2">Select Status</Typography>
            </ListSubheader>
            <Divider />
            {STATUS_OPTIONS.map((status) => (
              <MenuItem
                key={status.value}
                onClick={() => handleAddFilter('status', status.value)}
                sx={{
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                  ...(isFilterActive('status', status.value) && {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.primary.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.1),
                  })
                }}
              >
                <Checkbox
                  checked={isFilterActive('status', status.value)}
                  size="small"
                  edge="start"
                  color="primary"
                  disableRipple
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                />
                <ListItemText primary={status.label} />
              </MenuItem>
            ))}
          </>
        )}
        
        {currentFilterType === 'brand' && (
          <>
            <ListSubheader
              sx={{
                bgcolor: 'background.paper',
                lineHeight: '36px',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2
              }}
            >
              <Typography variant="subtitle2">Select Brand</Typography>
            </ListSubheader>
            <Divider />
            {availableBrands.length === 0 ? (
              <MenuItem disabled>
                <ListItemText primary="No brands available" />
              </MenuItem>
            ) : (
              availableBrands.map((brand) => (
                <MenuItem
                  key={brand}
                  onClick={() => handleAddFilter('brand', brand)}
                  sx={{
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                    ...(isFilterActive('brand', brand) && {
                      bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.primary.main, 0.2)
                        : alpha(theme.palette.primary.main, 0.1),
                    })
                  }}
                >
                  <Checkbox
                    checked={isFilterActive('brand', brand)}
                    size="small"
                    edge="start"
                    color="primary"
                    disableRipple
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                  />
                  <ListItemText primary={brand} />
                </MenuItem>
              ))
            )}
          </>
        )}
      </Menu>
    </Box>
  );
};

export default InventoryFilter;