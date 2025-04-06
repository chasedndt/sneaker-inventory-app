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
  useTheme,
  Popover,
  Card,
  CardContent,
  Divider,
  Badge
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import InventoryIcon from '@mui/icons-material/Inventory';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { InventoryItem, Tag } from '../../pages/InventoryPage';
import useFormat from '../../hooks/useFormat';

interface InventoryTableProps {
  items: InventoryItem[];
  visibleColumns: { [key: string]: boolean };
  selectedItems: number[];
  onSelectItem: (itemId: number, checked: boolean) => void;
  onUpdateMarketPrice: (itemId: number, newPrice: number) => void;
  onDuplicateItem: (item: InventoryItem) => void;
  page: number;
  rowsPerPage: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  tagColorMap: Record<string, string>;
  tags: Tag[];
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  visibleColumns,
  selectedItems,
  onSelectItem,
  onUpdateMarketPrice,
  onDuplicateItem,
  page,
  rowsPerPage,
  totalItems,
  onPageChange,
  tagColorMap,
  tags
}) => {
  const theme = useTheme();
  const { money, date } = useFormat();
  const [editingMarketPrice, setEditingMarketPrice] = useState<number | null>(null);
  const [marketPriceValue, setMarketPriceValue] = useState<string>('');
  const marketPriceInputRef = useRef<HTMLInputElement>(null);
  
  // Profit tooltip state
  const [profitAnchorEl, setProfitAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedProfitItem, setSelectedProfitItem] = useState<InventoryItem | null>(null);
  
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
  
  // Get status elements with improved visual design
  const getStatusElement = (status: 'unlisted' | 'listed' | 'sold') => {
    switch (status) {
      case 'unlisted':
        return (
          <Tooltip title="Unlisted - Not yet listed for sale">
            <Chip
              size="small"
              label="Unlisted"
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.08)',
                color: theme.palette.text.secondary,
                fontSize: '0.75rem',
                height: 24
              }}
            />
          </Tooltip>
        );
      case 'listed':
        return (
          <Tooltip title="Listed - Available for sale">
            <Chip
              size="small"
              icon={<ShoppingBasketIcon />}
              label="Listed"
              sx={{
                bgcolor: theme.palette.success.main,
                color: 'white',
                fontSize: '0.75rem',
                height: 24
              }}
            />
          </Tooltip>
        );
      case 'sold':
        return (
          <Tooltip title="Sold - No longer in inventory">
            <Chip
              size="small"
              label="Sold"
              sx={{
                bgcolor: theme.palette.error.main,
                color: 'white',
                fontSize: '0.75rem',
                height: 24
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
  
  // Handle profit info click
  const handleProfitInfoClick = (event: React.MouseEvent<HTMLElement>, item: InventoryItem) => {
    setProfitAnchorEl(event.currentTarget);
    setSelectedProfitItem(item);
  };
  
  const handleProfitInfoClose = () => {
    setProfitAnchorEl(null);
    setSelectedProfitItem(null);
  };
  
  // Render tags for an item
  const renderTags = (item: InventoryItem) => {
    if (!item.tags || item.tags.length === 0) {
      return null;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {item.tags.map((tagId, index) => {
          const tag = tags.find(t => t.id === tagId);
          if (!tag) return null;
          
          return (
            <Chip
              key={tagId}
              label={tag.name}
              size="small"
              icon={<LocalOfferIcon style={{ fontSize: '0.75rem' }} />}
              sx={{
                bgcolor: `${tag.color}22`,
                color: tag.color,
                borderColor: tag.color,
                fontSize: '0.7rem',
                height: 20,
                '& .MuiChip-icon': {
                  color: tag.color
                }
              }}
              variant="outlined"
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Paper sx={{ 
      width: '100%', 
      overflow: 'hidden',
      backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2d' : '#fff',
      borderRadius: 2
    }}>
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
                <TableCell sx={{ minWidth: 90 }}>Status</TableCell>
              )}
              
              {visibleColumns.image && (
                <TableCell sx={{ minWidth: 70 }}>Image</TableCell>
              )}
              
              {visibleColumns.name && (
                <TableCell sx={{ minWidth: 150 }}>Product Name</TableCell>
              )}
              
              {visibleColumns.category && (
                <TableCell sx={{ minWidth: 100 }}>Category</TableCell>
              )}
              
              {visibleColumns.marketPrice && (
                <TableCell align="right" sx={{ minWidth: 130 }}>Market Price</TableCell>
              )}
              
              {visibleColumns.estimatedProfit && (
                <TableCell align="right" sx={{ minWidth: 130 }}>Est. Profit</TableCell>
              )}
              
              {visibleColumns.size && (
                <TableCell sx={{ minWidth: 80 }}>Size</TableCell>
              )}
              
              {visibleColumns.brand && (
                <TableCell sx={{ minWidth: 100 }}>Brand</TableCell>
              )}
              
              {visibleColumns.reference && (
                <TableCell sx={{ minWidth: 120 }}>Purchase Date</TableCell>
              )}
              
              {visibleColumns.sku && (
                <TableCell sx={{ minWidth: 100 }}>SKU/ID</TableCell>
              )}
              
              {visibleColumns.daysInInventory && (
                <TableCell align="right" sx={{ minWidth: 90 }}>Days In</TableCell>
              )}
              
              {visibleColumns.roi && (
                <TableCell align="right" sx={{ minWidth: 90 }}>ROI</TableCell>
              )}
              
              {visibleColumns.purchaseTotal && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Purchase Total</TableCell>
              )}
              
              {visibleColumns.shippingAmount && (
                <TableCell align="right" sx={{ minWidth: 120 }}>Shipping</TableCell>
              )}
              
              {visibleColumns.tags && (
                <TableCell sx={{ minWidth: 150 }}>Tags</TableCell>
              )}
              
              <TableCell sx={{ minWidth: 100 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} 
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
                        {getStatusElement(item.status)}
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
                        
                        {/* Badges for listings */}
                        {item.listings && item.listings.length > 0 && (
                          <Badge
                            badgeContent={item.listings.length}
                            color="primary"
                            sx={{ ml: 1 }}
                          >
                            <ShoppingBasketIcon sx={{ fontSize: '0.875rem' }} />
                          </Badge>
                        )}
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
                              {money(item.marketPrice)}
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
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end',
                          cursor: 'pointer'
                        }}>
                          {item.estimatedProfit >= 0 ? (
                            <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                          ) : (
                            <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
                          )}
                          <Typography
                            onClick={(e) => handleProfitInfoClick(e, item)}
                          >
                            {money(Math.abs(item.estimatedProfit))}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleProfitInfoClick(e, item)}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    )}
                    
                    {visibleColumns.size && (
                      <TableCell>
                        {item.size ? (
                          item.sizeSystem ? `${item.sizeSystem} ${item.size}` : item.size
                        ) : (
                          <Typography color="text.disabled" variant="body2">-</Typography>
                        )}
                      </TableCell>
                    )}
                    
                    {visibleColumns.brand && (
                      <TableCell>
                        {item.brand}
                      </TableCell>
                    )}
                    
                    {visibleColumns.reference && (
                      <TableCell>
                        {date(item.purchaseDate)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.sku && (
                      <TableCell>
                        {item.reference || '-'}
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
                        {money(item.purchasePrice)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.shippingAmount && (
                      <TableCell align="right">
                        {money(item.shippingPrice || 0)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.tags && (
                      <TableCell>
                        {renderTags(item)}
                      </TableCell>
                    )}
                    
                    {/* Actions Column */}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Duplicate Item">
                          <IconButton
                            size="small"
                            onClick={() => onDuplicateItem(item)}
                          >
                            <ContentCopyIcon fontSize="small" />
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
      
      {/* Profit Breakdown Popover */}
      <Popover
        open={Boolean(profitAnchorEl)}
        anchorEl={profitAnchorEl}
        onClose={handleProfitInfoClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        {selectedProfitItem && (
          <Card sx={{ 
            width: 280,
            p: 0.5,
            bgcolor: theme.palette.background.paper,
          }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Profit Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary" paragraph>
                {selectedProfitItem.productName}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Market Price</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {money(selectedProfitItem.marketPrice)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Purchase Price</Typography>
                  <Typography variant="body2" color="text.secondary">
                    - {money(selectedProfitItem.purchasePrice)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Shipping Cost</Typography>
                  <Typography variant="body2" color="text.secondary">
                    - {money(selectedProfitItem.shippingPrice || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Est. Platform Fees (10%)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    - {money(selectedProfitItem.marketPrice * 0.1)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="subtitle2">Estimated Profit</Typography>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: selectedProfitItem.estimatedProfit >= 0 
                        ? theme.palette.success.main 
                        : theme.palette.error.main
                    }}
                  >
                    {money(selectedProfitItem.estimatedProfit)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">ROI</Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 'medium',
                      color: selectedProfitItem.roi >= 0 
                        ? theme.palette.success.main 
                        : theme.palette.error.main
                    }}
                  >
                    {selectedProfitItem.roi.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                Note: Actual profit may vary based on final sale price and platform fees.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Popover>
    </Paper>
  );
};

export default InventoryTable;