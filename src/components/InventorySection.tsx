import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { Item } from '../services/api';

// Props interface: the InventorySection now receives real items as a prop.
interface InventorySectionProps {
  items: Item[];
}

// Helper function to calculate percentage change
const calculateChange = (purchasePrice: number, currentValue: number): number => {
  return purchasePrice === 0 ? 0 : ((currentValue - purchasePrice) / purchasePrice) * 100;
};

const InventorySection: React.FC<InventorySectionProps> = ({ items }) => {
  // If there are no items yet, show a loader
  if (items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Your Inventory</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select defaultValue="quantity" label="Sort by">
            <MenuItem value="quantity">Quantity</MenuItem>
            <MenuItem value="value">Value</MenuItem>
            <MenuItem value="change">Change</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell align="right">Purchase Price</TableCell>
              <TableCell align="right">Current Value</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell>Purchase Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              // For demonstration, we're using purchasePrice as the current value.
              // You can later replace it with actual current market value.
              const currentValue = item.purchasePrice;
              const change = calculateChange(item.purchasePrice, currentValue);
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell align="right">${item.purchasePrice.toFixed(2)}</TableCell>
                  <TableCell align="right">${currentValue.toFixed(2)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: change >= 0 ? 'success.main' : 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5
                    }}
                  >
                    {change >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                    {change.toFixed(1)}%
                  </TableCell>
                  <TableCell>{new Date(item.purchaseDate).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default InventorySection;
