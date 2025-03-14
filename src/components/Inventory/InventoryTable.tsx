// src/components/Inventory/InventoryTable.tsx
import React, { useState, useRef } from 'react';
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
  TextField,
  InputAdornment,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';

import { InventoryItem } from '../../pages/InventoryPage';

interface InventoryTableProps {
  items: InventoryItem[];
  visibleColumns: { [key: string]: boolean };
  selectedItems: number[];
  onSelectItem: (itemId: number, checked: boolean) => void;
  onUpdateMarketPrice: (itemId: number, newPrice: number) => void;
  page: number;
  rowsPerPage: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  visibleColumns,
  selectedItems,
  onSelectItem,
  onUpdateMarketPrice,
  page,
  rowsPerPage,
  totalItems,
  onPageChange
}) => {
  const theme = useTheme();
  const [editingMarketPrice, setEditingMarketPrice] = useState<number | null>(null);
  const [marketPriceValue, setMarketPriceValue] = useState<string>('');
  const marketPriceInputRef = useRef<HTMLInputElement>(null);
  
  const handleChangePage = (event: unknown, newPage: number) => {
    onPageChange(newPage);
  };
  
  const handleStartEditing = (item: InventoryItem) => {
    setEditingMarketPrice(item.id);
    setMarketPriceValue(item.marketPrice.toString());
    // Focus input on next render cycle
    setTimeout(() => {
      if (marketPriceInputRef.current) {
        marketPriceInputRef.current.focus();
        marketPriceInputRef.current.select();
      }
    }, 0);
  };
  
  const handleSaveMarketPrice = (itemId: number) => {
    const newPrice = parseFloat(marketPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onUpdateMarketPrice(itemId, newPrice);
    }
    setEditingMarketPrice(null);
  };
  
  const handleCancelEditing = () => {
    setEditingMarketPrice(null);
  };
  
  // Updated getStatusIcon function to handle 'unlisted' status
  const getStatusIcon = (status: 'unlisted' | 'listed' | 'sold') => {
    switch (status) {
      case 'unlisted':
        return (
          <Tooltip title="Unlisted">
            <FiberManualRecordIcon 
              sx={{ 
                color: 'success.main', 
                fontSize: 16
              }} 
            />
          </Tooltip>
        );
      case 'listed':
        return (
          <Tooltip title="Listed">
            <AttachMoneyIcon 
              sx={{ 
                color: 'warning.main', 
                fontSize: 16
              }} 
            />
          </Tooltip>
        );
      case 'sold':
        return (
          <Tooltip title="Sold">
            <FiberManualRecordIcon 
              sx={{ 
                color: 'error.main', 
                fontSize: 16
              }} 
            />
          </Tooltip>
        );
      default:
        return null;
    }
  };
  
  const renderImage = (item: InventoryItem) => {
    if (item.imageUrl) {
      return (
        <Avatar 
          src={item.imageUrl} 
          alt={item.productName}
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
  
  return (
    <Paper 
      sx={{ 
        width: '100%', 
        overflow: 'hidden',
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2d' : '#fff',
        borderRadius: 2
      }}
    >
      <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  indeterminate={selectedItems.length > 0 && selectedItems.length < items.length}
                  checked={items.length > 0 && selectedItems.length === items.length}
                  onChange={(event) => {
                    if (event.target.checked) {
                      items.forEach(item => onSelectItem(item.id, true));
                    } else {
                      items.forEach(item => onSelectItem(item.id, false));
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
              
              {visibleColumns.status && (
                <TableCell sx={{ minWidth: 50 }}>Status</TableCell>
              )}
              
              {visibleColumns.image && (
                <TableCell sx={{ minWidth: 60 }}>Image</TableCell>
              )}
              
              {visibleColumns.name && (
                <TableCell sx={{ minWidth: 150 }}>Product Name</TableCell>
              )}
              
              {visibleColumns.category && (
                <TableCell sx={{ minWidth: 100 }}>Category</TableCell>
              )}
              
              {visibleColumns.marketPrice && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Market Price</TableCell>
              )}
              
              {visibleColumns.estimatedProfit && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Est. Profit</TableCell>
              )}
              
              {visibleColumns.size && (
                <TableCell sx={{ minWidth: 80 }}>Size</TableCell>
              )}
              
              {visibleColumns.brand && (
                <TableCell sx={{ minWidth: 100 }}>Brand</TableCell>
              )}
              
              {visibleColumns.reference && (
                <TableCell sx={{ minWidth: 100 }}>Reference</TableCell>
              )}
              
              {visibleColumns.sku && (
                <TableCell sx={{ minWidth: 100 }}>SKU/ID</TableCell>
              )}
              
              {visibleColumns.daysInInventory && (
                <TableCell align="right" sx={{ minWidth: 80 }}>Days In</TableCell>
              )}
              
              {visibleColumns.roi && (
                <TableCell align="right" sx={{ minWidth: 80 }}>ROI</TableCell>
              )}
              
              {visibleColumns.purchaseTotal && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Purchase Total</TableCell>
              )}
              
              {visibleColumns.shippingAmount && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Shipping</TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} 
                  align="center" 
                  sx={{ py: 3 }}
                >
                  <Typography variant="body2" color="textSecondary">
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                const isEditing = editingMarketPrice === item.id;
                
                return (
                  <TableRow
                    hover
                    key={item.id}
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
                        onChange={(event) => onSelectItem(item.id, event.target.checked)}
                        sx={{
                          color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined,
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                    </TableCell>
                    
                    {visibleColumns.status && (
                      <TableCell>
                        {getStatusIcon(item.status)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.image && (
                      <TableCell>
                        {renderImage(item)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.name && (
                      <TableCell
                        sx={{
                          fontWeight: 'medium',
                          color: theme.palette.primary.main,
                          cursor: 'pointer',
                        }}
                      >
                        {item.productName}
                      </TableCell>
                    )}
                    
                    {visibleColumns.category && (
                      <TableCell>
                        <Chip 
                          label={item.category} 
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem',
                            height: 24
                          }}
                        />
                      </TableCell>
                    )}
                    
                    {visibleColumns.marketPrice && (
                      <TableCell align="right">
                        {isEditing ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TextField
                              inputRef={marketPriceInputRef}
                              variant="outlined"
                              size="small"
                              value={marketPriceValue}
                              onChange={(e) => setMarketPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveMarketPrice(item.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditing();
                                }
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">$</InputAdornment>
                                ),
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleSaveMarketPrice(item.id)}
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={handleCancelEditing}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </InputAdornment>
                                ),
                                sx: { py: 0.5 }
                              }}
                              sx={{ maxWidth: 160 }}
                            />
                          </Box>
                        ) : (
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'flex-end' 
                            }}
                          >
                            <Typography>
                              ${item.marketPrice.toFixed(2)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleStartEditing(item)}
                              sx={{ ml: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    )}
                    
                    {visibleColumns.estimatedProfit && (
                      <TableCell 
                        align="right"
                        sx={{
                          color: item.estimatedProfit >= 0 
                            ? theme.palette.success.main 
                            : theme.palette.error.main,
                          fontWeight: 'medium'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {item.estimatedProfit >= 0 ? (
                            <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                          ) : (
                            <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
                          )}
                          ${Math.abs(item.estimatedProfit).toFixed(2)}
                        </Box>
                      </TableCell>
                    )}
                    
                    {visibleColumns.size && (
                      <TableCell>
                        {item.size}
                      </TableCell>
                    )}
                    
                    {visibleColumns.brand && (
                      <TableCell>
                        {item.brand}
                      </TableCell>
                    )}
                    
                    {visibleColumns.reference && (
                      <TableCell>
                        {item.reference || '-'}
                      </TableCell>
                    )}
                    
                    {visibleColumns.sku && (
                      <TableCell>
                        <Tooltip title="Internal ID">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {item.id}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    )}
                    
                    {visibleColumns.daysInInventory && (
                      <TableCell align="right">
                        {item.daysInInventory} days
                      </TableCell>
                    )}
                    
                    {visibleColumns.roi && (
                      <TableCell 
                        align="right"
                        sx={{
                          color: item.roi >= 0 
                            ? theme.palette.success.main 
                            : theme.palette.error.main,
                          fontWeight: 'medium'
                        }}
                      >
                        {item.roi.toFixed(1)}%
                      </TableCell>
                    )}
                    
                    {visibleColumns.purchaseTotal && (
                      <TableCell align="right">
                        ${item.purchasePrice.toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.shippingAmount && (
                      <TableCell align="right">
                        ${(item.shippingPrice || 0).toFixed(2)}
                      </TableCell>
                    )}
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
        count={totalItems}
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
        }}
      />
    </Paper>
  );
};

export default InventoryTable;