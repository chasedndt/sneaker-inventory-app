// src/components/Inventory/ColumnCustomizationMenu.tsx
import React from 'react';
import {
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Typography,
  Divider,
  Box,
  useTheme
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

interface ColumnCustomizationMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  columns: { [key: string]: boolean };
  onToggleColumn: (column: string) => void;
}

// Helper function to format column names
const formatColumnName = (column: string): string => {
  switch (column) {
    case 'image':
      return 'Product Image';
    case 'name':
      return 'Product Name';
    case 'category':
      return 'Category';
    case 'marketPrice':
      return 'Market Price';
    case 'estimatedProfit':
      return 'Estimated Profit';
    case 'size':
      return 'Size';
    case 'brand':
      return 'Brand';
    case 'reference':
      return 'Reference';
    case 'sku':
      return 'SKU/ID';
    case 'daysInInventory':
      return 'Days In Inventory';
    case 'roi':
      return 'ROI';
    case 'purchaseTotal':
      return 'Purchase Total';
    case 'shippingAmount':
      return 'Shipping Amount';
    case 'status':
      return 'Status';
    default:
      return column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1');
  }
};

const ColumnCustomizationMenu: React.FC<ColumnCustomizationMenuProps> = ({
  anchorEl,
  open,
  onClose,
  columns,
  onToggleColumn
}) => {
  const theme = useTheme();
  
  // Group columns into categories
  const essentialColumns = ['image', 'name', 'category', 'status'];
  const pricingColumns = ['marketPrice', 'estimatedProfit', 'purchaseTotal', 'shippingAmount', 'roi'];
  const detailColumns = ['size', 'brand', 'reference', 'sku', 'daysInInventory'];
  
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          width: 280,
          p: 1,
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <ViewColumnIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            Customize Columns
          </Typography>
        </Box>
        <Typography variant="caption" color="textSecondary">
          Select which columns to display in your inventory table.
        </Typography>
      </Box>
      
      <Divider />
      
      <List dense sx={{ py: 0 }}>
        <ListItem>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Essential
          </Typography>
        </ListItem>
        
        {essentialColumns.map((column) => (
          <ListItem key={column} dense button onClick={() => onToggleColumn(column)}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox
                edge="start"
                checked={columns[column]}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={formatColumnName(column)} />
          </ListItem>
        ))}
        
        <Divider sx={{ my: 1 }} />
        
        <ListItem>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Pricing & Profit
          </Typography>
        </ListItem>
        
        {pricingColumns.map((column) => (
          <ListItem key={column} dense button onClick={() => onToggleColumn(column)}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox
                edge="start"
                checked={columns[column]}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={formatColumnName(column)} />
          </ListItem>
        ))}
        
        <Divider sx={{ my: 1 }} />
        
        <ListItem>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Details
          </Typography>
        </ListItem>
        
        {detailColumns.map((column) => (
          <ListItem key={column} dense button onClick={() => onToggleColumn(column)}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox
                edge="start"
                checked={columns[column]}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={formatColumnName(column)} />
          </ListItem>
        ))}
      </List>
    </Popover>
  );
};

export default ColumnCustomizationMenu;