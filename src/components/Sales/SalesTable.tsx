// src/components/Sales/SalesTable.tsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TablePagination,
  Typography,
  Box,
  Avatar,
  Chip,
  useTheme,
  Tooltip,
  IconButton,
  Alert
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import useFormat from '../../hooks/useFormat'; // Import the formatting hook
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../services/api';

import { SalesItem } from '../../pages/SalesPage';

interface SalesTableProps {
  sales: SalesItem[];
  visibleColumns: { [key: string]: boolean };
  selectedSales: number[];
  onSelectSale: (saleId: number, checked: boolean) => void;
  page: number;
  rowsPerPage: number;
  totalSales: number;
  onPageChange: (newPage: number) => void;
  onDeleteSale: (saleId: number) => void;
  onRestoreToInventory: (saleId: number) => void;
}

const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  visibleColumns,
  selectedSales,
  onSelectSale,
  page,
  rowsPerPage,
  totalSales,
  onPageChange,
  onDeleteSale,
  onRestoreToInventory
}) => {
  const theme = useTheme();
  const { money, date } = useFormat(); // Use the formatting hook
  const { currentUser } = useAuth();
  const { isAuthenticated } = useApi();
  
  const handleChangePage = (event: unknown, newPage: number) => {
    onPageChange(newPage);
  };
  
  // Function to get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'stockx':
        return <StorefrontIcon sx={{ color: '#00FF00' }} />;
      case 'goat':
        return <ShoppingBasketIcon sx={{ color: '#FF5A5F' }} />;
      case 'ebay':
        return <ShoppingBagIcon sx={{ color: '#0064D2' }} />;
      default:
        return <StorefrontIcon sx={{ color: theme.palette.text.secondary }} />;
    }
  };
  
  // Function to get status chip
  const getStatusChip = (status: string) => {
    let color = '';
    let label = status;
    
    switch (status) {
      case 'pending':
        color = '#F59E0B'; // Yellow
        label = 'Pending';
        break;
      case 'completed':
        color = '#10B981'; // Green
        label = 'Completed';
        break;
      case 'needsShipping':
        color = '#F97316'; // Orange
        label = 'Needs Shipping';
        break;
      default:
        color = theme.palette.grey[500];
        label = 'Unknown';
    }
    
    return (
      <Chip 
        label={label} 
        size="small"
        sx={{ 
          backgroundColor: color,
          color: 'white',
          fontWeight: 'medium',
          fontSize: '0.75rem',
          height: 24,
          borderRadius: '12px'
        }}
      />
    );
  };

  // Render image avatar
  const renderImage = (item: SalesItem) => {
    if (item.imageUrl) {
      return (
        <Avatar 
          src={item.imageUrl} 
          alt={item.itemName}
          variant="rounded"
          sx={{ width: 48, height: 48 }}
        />
      );
    }
    return (
      <Avatar 
        variant="rounded"
        sx={{ 
          width: 48, 
          height: 48, 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }}
      >
        <InventoryIcon />
      </Avatar>
    );
  };
  
  // If not authenticated, show a message
  if (!isAuthenticated) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Alert severity="warning">
          Authentication required to view sales data. Please log in.
        </Alert>
      </Paper>
    );
  }
  
  return (
    <Paper 
      sx={{ 
        width: '100%', 
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2
      }}
    >
      <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  indeterminate={selectedSales.length > 0 && selectedSales.length < sales.length}
                  checked={sales.length > 0 && selectedSales.length === sales.length}
                  onChange={(event) => {
                    if (event.target.checked) {
                      sales.forEach(sale => onSelectSale(sale.id, true));
                    } else {
                      sales.forEach(sale => onSelectSale(sale.id, false));
                    }
                  }}
                  sx={{
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined,
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              </TableCell>
              
              {visibleColumns.image && (
                <TableCell sx={{ minWidth: 60 }}>Image</TableCell>
              )}
              
              {visibleColumns.itemName && (
                <TableCell sx={{ minWidth: 150 }}>Item Name</TableCell>
              )}
              
              {visibleColumns.platform && (
                <TableCell sx={{ minWidth: 120 }}>Platform</TableCell>
              )}
              
              {visibleColumns.saleDate && (
                <TableCell sx={{ minWidth: 110 }}>Sale Date</TableCell>
              )}
              
              {visibleColumns.salePrice && (
                <TableCell align="right" sx={{ minWidth: 100 }}>Sale Price</TableCell>
              )}
              
              {visibleColumns.tax && (
                <TableCell align="right" sx={{ minWidth: 80 }}>Tax</TableCell>
              )}
              
              {visibleColumns.fees && (
                <TableCell align="right" sx={{ minWidth: 80 }}>Fees</TableCell>
              )}
              
              {visibleColumns.status && (
                <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
              )}
              
              {visibleColumns.profit && (
                <TableCell align="right" sx={{ minWidth: 100 }}>Profit</TableCell>
              )}
              
              {visibleColumns.brand && (
                <TableCell sx={{ minWidth: 100 }}>Brand</TableCell>
              )}
              
              {visibleColumns.purchaseDate && (
                <TableCell sx={{ minWidth: 110 }}>Purchase Date</TableCell>
              )}
              
              {visibleColumns.purchasePrice && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Purchase Price</TableCell>
              )}
              
              {visibleColumns.ROI && (
                <TableCell align="right" sx={{ minWidth: 80 }}>ROI</TableCell>
              )}
              
              {visibleColumns.daysToSell && (
                <TableCell align="right" sx={{ minWidth: 100 }}>Days to Sell</TableCell>
              )}
              
              {visibleColumns.size && (
                <TableCell sx={{ minWidth: 80 }}>Size</TableCell>
              )}
              
              {/* Actions Column */}
              <TableCell sx={{ minWidth: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} // +2 for checkbox and actions
                  align="center" 
                  sx={{ py: 3 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No sales found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const isSelected = selectedSales.includes(sale.id);
                
                return (
                  <TableRow
                    hover
                    key={sale.id}
                    selected={isSelected}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.05)' 
                          : 'rgba(0,0,0,0.04)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(66, 165, 245, 0.1)' 
                          : 'rgba(25, 118, 210, 0.08)',
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={isSelected}
                        onChange={(event) => onSelectSale(sale.id, event.target.checked)}
                        sx={{
                          color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined,
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                    </TableCell>
                    
                    {visibleColumns.image && (
                      <TableCell>
                        {renderImage(sale)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.itemName && (
                      <TableCell
                        sx={{
                          fontWeight: 'medium',
                          color: theme.palette.primary.main,
                          cursor: 'pointer',
                        }}
                      >
                        {sale.itemName}
                      </TableCell>
                    )}
                    
                    {visibleColumns.platform && (
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getPlatformIcon(sale.platform)}
                          <Typography variant="body2" color={theme.palette.text.primary}>
                            {sale.platform}
                          </Typography>
                        </Box>
                      </TableCell>
                    )}
                    
                    {visibleColumns.saleDate && (
                      <TableCell>
                        {date(sale.saleDate)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.salePrice && (
                      <TableCell align="right">
                        {money(sale.salePrice)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.tax && (
                      <TableCell align="right">
                        {sale.salesTax ? money(sale.salesTax) : money(0)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.fees && (
                      <TableCell align="right">
                        {sale.platformFees ? money(sale.platformFees) : money(0)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.status && (
                      <TableCell>
                        {getStatusChip(sale.status)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.profit && (
                      <TableCell 
                        align="right"
                        sx={{
                          color: sale.profit >= 0 
                            ? theme.palette.success.main 
                            : theme.palette.error.main,
                          fontWeight: 'medium'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {sale.profit >= 0 ? (
                            <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                          ) : (
                            <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
                          )}
                          {money(Math.abs(sale.profit))}
                        </Box>
                      </TableCell>
                    )}
                    
                    {visibleColumns.brand && (
                      <TableCell>
                        {sale.brand}
                      </TableCell>
                    )}
                    
                    {visibleColumns.purchaseDate && (
                      <TableCell>
                        {/* This would show the purchase date of the item */}
                        <Typography variant="body2" color="text.secondary">
                          {date(new Date(Date.now() - (sale.daysToSell * 24 * 60 * 60 * 1000)).toISOString())}
                        </Typography>
                      </TableCell>
                    )}
                    
                    {visibleColumns.purchasePrice && (
                      <TableCell align="right">
                        {money(sale.purchasePrice)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.ROI && (
                      <TableCell 
                        align="right"
                        sx={{
                          color: sale.ROI >= 0 
                            ? theme.palette.success.main 
                            : theme.palette.error.main,
                          fontWeight: 'medium'
                        }}
                      >
                        {sale.ROI.toFixed(1)}%
                      </TableCell>
                    )}
                    
                    {visibleColumns.daysToSell && (
                      <TableCell align="right">
                        {sale.daysToSell} days
                      </TableCell>
                    )}
                    
                    {visibleColumns.size && (
                      <TableCell>
                        {sale.size || '-'}
                      </TableCell>
                    )}
                    
                    {/* Actions Column */}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Restore to Inventory">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => onRestoreToInventory(sale.id)}
                            sx={{ 
                              bgcolor: 'rgba(25, 118, 210, 0.08)',
                              '&:hover': {
                                bgcolor: 'rgba(25, 118, 210, 0.15)'
                              }
                            }}
                          >
                            <KeyboardReturnIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete Sale">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => onDeleteSale(sale.id)}
                            sx={{ 
                              bgcolor: 'rgba(211, 47, 47, 0.08)',
                              '&:hover': {
                                bgcolor: 'rgba(211, 47, 47, 0.15)'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={totalSales}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={(e) => {
          // This will be handled by the parent component
        }}
        sx={{
          borderTop: `1px solid ${
            theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)'
              : theme.palette.divider
          }`,
          color: theme.palette.text.primary
        }}
      />
    </Paper>
  );
};

export default SalesTable;