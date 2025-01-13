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
  InputLabel
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface InventoryItem {
  id: number;
  name: string;
  size: string;
  purchasePrice: number;
  currentValue: number;
  change: number;
  quantity: number;
}

const mockInventoryData: InventoryItem[] = [
  {
    id: 1,
    name: "Nike Air Jordan 1 High",
    size: "US 10",
    purchasePrice: 170,
    currentValue: 220,
    change: 29.4,
    quantity: 2
  },
  {
    id: 2,
    name: "Yeezy Boost 350",
    size: "US 9",
    purchasePrice: 220,
    currentValue: 280,
    change: 27.3,
    quantity: 1
  }
];

const InventorySection: React.FC = () => {
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
              <TableCell>Size</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Purchase Price</TableCell>
              <TableCell align="right">Current Value</TableCell>
              <TableCell align="right">Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockInventoryData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.size}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">${item.purchasePrice}</TableCell>
                <TableCell align="right">${item.currentValue}</TableCell>
                <TableCell 
                  align="right"
                  sx={{ 
                    color: item.change >= 0 ? 'success.main' : 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 0.5
                  }}
                >
                  {item.change >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                  {item.change}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default InventorySection;
