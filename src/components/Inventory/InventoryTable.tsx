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
import StorefrontIcon from '@mui/icons-material/Storefront';
import LinkIcon from '@mui/icons-material/Link';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { InventoryItem, Tag } from '../../pages/InventoryPage';
import useFormat from '../../hooks/useFormat';
import dayjs from 'dayjs';
import ImageViewer from '../common/ImageViewer';

// Sort order type
type SortOrder = 'asc' | 'desc' | null;

// Sort field type - represents all sortable fields in our inventory
type SortField = 
  | 'status' 
  | 'productName'
  | 'category' 
  | 'marketPrice' 
  | 'estimatedProfit' 
  | 'size' 
  | 'brand' 
  | 'purchaseDate' 
  | 'reference' 
  | 'daysInInventory' 
  | 'roi' 
  | 'purchaseTotal' 
  | 'shippingAmount';

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
  const { money, date, getCurrentCurrency } = useFormat();
  const [editingMarketPrice, setEditingMarketPrice] = useState<number | null>(null);
  const [marketPriceValue, setMarketPriceValue] = useState<string>('');
  const marketPriceInputRef = useRef<HTMLInputElement>(null);
  const currencySymbol = getCurrentCurrency();
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  
  // Profit tooltip state
  const [profitAnchorEl, setProfitAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedProfitItem, setSelectedProfitItem] = useState<InventoryItem | null>(null);
  
  // Listing tooltip state
  const [listingAnchorEl, setListingAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedListingItem, setSelectedListingItem] = useState<InventoryItem | null>(null);
  
  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  // Field types classification for initial sort direction
  const numericFields = ['marketPrice', 'estimatedProfit', 'purchaseTotal', 'shippingAmount', 'roi'];
  const dateFields = ['purchaseDate', 'daysInInventory'];
  const textFields = ['status', 'productName', 'category', 'size', 'brand', 'reference'];
  
  // Handle column header click for sorting
  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      // If already sorting by this field, cycle through sort orders: asc -> desc -> null
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortOrder(null);
        setSortField(null);
      } else {
        setSortOrder('asc');
      }
    } else {
      // If sorting by a new field, set the field and start with appropriate initial direction
      setSortField(field);
      
      // For all fields, consistently start with ascending order first
      setSortOrder('asc');
    }
  };
  
  // Sort items based on current sort field and order
  const sortedItems = React.useMemo(() => {
    if (!sortField || !sortOrder) return items;
    
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      // Sort based on field type
      switch (sortField) {
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'productName':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'marketPrice':
          comparison = (a.marketPrice || 0) - (b.marketPrice || 0);
          break;
        case 'estimatedProfit':
          comparison = a.estimatedProfit - b.estimatedProfit;
          break;
        case 'size':
          comparison = (a.size || '').localeCompare(b.size || '');
          break;
        case 'brand':
          comparison = a.brand.localeCompare(b.brand);
          break;
        case 'purchaseDate':
          comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
          break;
        case 'reference':
          comparison = (a.reference || '').localeCompare(b.reference || '');
          break;
        case 'daysInInventory':
          comparison = a.daysInInventory - b.daysInInventory;
          break;
        case 'roi':
          comparison = a.roi - b.roi;
          break;
        case 'purchaseTotal':
          comparison = a.purchasePrice - b.purchasePrice;
          break;
        case 'shippingAmount':
          comparison = (a.shippingPrice || 0) - (b.shippingPrice || 0);
          break;
        default:
          break;
      }
      
      // Apply sort order
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortOrder]);
  
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
  
  // Render sort icon for column headers
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field || !sortOrder) return null;
    
    return sortOrder === 'asc' ? (
      <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5, fontSize: '0.9rem' }} />
    ) : (
      <ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5, fontSize: '0.9rem' }} />
    );
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
    return (
      <Avatar 
        src={item.imageUrl} 
        alt={item.productName}
        variant="rounded"
        sx={{ 
          width: 48, 
          height: 48,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
            boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
            transform: 'scale(1.05)',
            transition: 'all 0.2s ease-in-out'
          }
        }}
        onClick={() => handleImageClick(item)}
      >
        <InventoryIcon />
      </Avatar>
    );
  };
  
  // Handle image click to open the image viewer
  const handleImageClick = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setImageViewerOpen(true);
  };
  
  // Handle closing the image viewer
  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setSelectedItemId(null);
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
  
  // Handle listings info click
  const handleListingsInfoClick = (event: React.MouseEvent<HTMLElement>, item: InventoryItem) => {
    if (item.listings && item.listings.length > 0) {
      setListingAnchorEl(event.currentTarget);
      setSelectedListingItem(item);
    }
  };
  
  const handleListingsInfoClose = () => {
    setListingAnchorEl(null);
    setSelectedListingItem(null);
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
                '&:hover': {
                  bgcolor: `${tag.color}44`,
                  transition: 'background-color 0.2s ease-in-out'
                },
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

  // Count item's listings
  const getListingsBadge = (item: InventoryItem) => {
    if (!item.listings || item.listings.length === 0) {
      return null;
    }
    
    const activeListings = item.listings.filter(listing => listing.status === 'active').length;
    
    return (
      <Tooltip title={`${activeListings} active listing(s)`}>
        <Badge
          badgeContent={activeListings}
          color="primary"
          sx={{ ml: 1 }}
          onClick={(e) => handleListingsInfoClick(e, item)}
        >
          <ShoppingBasketIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
        </Badge>
      </Tooltip>
    );
  };

  // Create sortable column header
  const SortableColumnHeader = ({ 
    field, 
    label, 
    align = 'left',
    minWidth
  }: { 
    field: SortField, 
    label: string, 
    align?: 'left' | 'right' | 'center',
    minWidth?: number | string
  }) => {
    return (
      <TableCell 
        align={align} 
        sx={{ 
          minWidth: minWidth,
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.04)',
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: '100%',
              height: '2px',
              backgroundColor: theme.palette.primary.main,
              transform: 'scaleX(1)',
              transition: 'transform 0.2s ease-in-out'
            }
          }
        }}
        onClick={() => handleSortClick(field)}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
        }}>
          {label}
          {renderSortIcon(field)}
        </Box>
      </TableCell>
    );
  };

  return (
    <>
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
                  <SortableColumnHeader field="status" label="Status" minWidth={90} />
                )}
                
                {visibleColumns.image && (
                  <TableCell sx={{ minWidth: 70 }}>Image</TableCell>
                )}
                
                {visibleColumns.name && (
                  <SortableColumnHeader field="productName" label="Product Name" minWidth={150} />
                )}
                
                {visibleColumns.category && (
                  <SortableColumnHeader field="category" label="Category" minWidth={100} />
                )}
                
                {visibleColumns.marketPrice && (
                  <SortableColumnHeader field="marketPrice" label="Market Price" minWidth={130} align="right" />
                )}
                
                {visibleColumns.estimatedProfit && (
                  <SortableColumnHeader field="estimatedProfit" label="Est. Profit" minWidth={130} align="right" />
                )}
                
                {visibleColumns.size && (
                  <SortableColumnHeader field="size" label="Size" minWidth={80} />
                )}
                
                {visibleColumns.brand && (
                  <SortableColumnHeader field="brand" label="Brand" minWidth={100} />
                )}
                
                {visibleColumns.reference && (
                  <SortableColumnHeader field="purchaseDate" label="Purchase Date" minWidth={120} />
                )}
                
                {visibleColumns.sku && (
                  <SortableColumnHeader field="reference" label="SKU/ID" minWidth={100} />
                )}
                
                {visibleColumns.daysInInventory && (
                  <SortableColumnHeader field="daysInInventory" label="Days In" minWidth={90} align="right" />
                )}
                
                {visibleColumns.roi && (
                  <SortableColumnHeader field="roi" label="ROI" minWidth={90} align="right" />
                )}
                
                {visibleColumns.purchaseTotal && (
                  <SortableColumnHeader field="purchaseTotal" label="Purchase Total" minWidth={120} align="right" />
                )}
                
                {visibleColumns.shippingAmount && (
                  <SortableColumnHeader field="shippingAmount" label="Shipping" minWidth={120} align="right" />
                )}
                
                {visibleColumns.tags && (
                  <TableCell sx={{ minWidth: 150 }}>Tags</TableCell>
                )}
              </TableRow>
            </TableHead>
            
            <TableBody>
              {sortedItems.length === 0 ? (
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
                sortedItems.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const isEditing = editingMarketPrice === item.id;
                  
                  return (
                    <TableRow
                      hover
                      key={item.id}
                      selected={isSelected}
                      sx={{
                        transition: 'background-color 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(255,255,255,0.07)' 
                            : 'rgba(0,0,0,0.03)',
                          '& .MuiTableCell-root': {
                            opacity: 1
                          }
                        },
                        '&.Mui-selected': {
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(66, 165, 245, 0.15)' 
                            : 'rgba(25, 118, 210, 0.12)',
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(66, 165, 245, 0.25)' 
                              : 'rgba(25, 118, 210, 0.18)',
                          }
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography 
                              color="inherit" 
                              sx={{
                                '&:hover': {
                                  textDecoration: 'underline',
                                  transition: 'color 0.2s ease'
                                }
                              }}
                            >
                              {item.productName}
                            </Typography>
                            {/* Display listings badge if item has listings */}
                            {item.status === 'listed' && getListingsBadge(item)}
                          </Box>
                        </TableCell>
                      )}
                      
                      {visibleColumns.category && (
                        <TableCell>
                          <Chip 
                            label={item.category} 
                            size="small"
                            sx={{ 
                              fontSize: '0.75rem',
                              height: 24,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transform: 'translateY(-1px)'
                              }
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
                                    <InputAdornment position="start">{currencySymbol}</InputAdornment>
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
                                sx={{ 
                                  ml: 1,
                                  opacity: 0.7,
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    opacity: 1,
                                    color: theme.palette.primary.main,
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                  }
                                }}
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
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)'
                            }
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
                              sx={{
                                opacity: 0.7,
                                '&:hover': {
                                  opacity: 1,
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
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
            boxShadow: theme.shadows[4],
            borderRadius: 2
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
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mt: 0.5
                }}>
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

      {/* Listings Info Popover */}
      <Popover
        open={Boolean(listingAnchorEl)}
        anchorEl={listingAnchorEl}
        onClose={handleListingsInfoClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.shadows[4]
          }
        }}
      >
        {selectedListingItem && selectedListingItem.listings && (
          <Card sx={{ 
            width: 320,
            p: 0.5,
            bgcolor: theme.palette.background.paper,
          }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Active Listings
              </Typography>
              <Typography variant="caption" color="text.secondary" paragraph>
                {selectedListingItem.productName}
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              {selectedListingItem.listings.map((listing, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StorefrontIcon fontSize="small" />
                        {listing.platform}
                      </Box>
                    </Typography>
                    <Chip 
                      label={listing.status.charAt(0).toUpperCase() + listing.status.slice(1)} 
                      size="small"
                      color={
                        listing.status === 'active' ? 'success' : 
                        listing.status === 'sold' ? 'warning' : 
                        'error'
                      }
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Price:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {money(listing.price)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Date Listed:</Typography>
                    <Typography variant="body2">
                      {typeof listing.date === 'string' 
                        ? date(listing.date) 
                        : dayjs(listing.date).format('MM/DD/YYYY')}
                    </Typography>
                  </Box>

                  {listing.url && (
                    <Box sx={{ mt: 1 }}>
                      <Typography 
                        variant="body2" 
                        component="a" 
                        href={listing.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          color: theme.palette.primary.main,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        <LinkIcon fontSize="small" />
                        View Listing
                      </Typography>
                    </Box>
                  )}
                  
                  {index < (selectedListingItem.listings?.length || 0) - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>
        )}
      </Popover>

      {/* Image Viewer Modal */}
      <ImageViewer
        open={imageViewerOpen}
        onClose={handleCloseImageViewer}
        itemId={selectedItemId}
        initialImageIndex={0}
      />
    </>
  );
};

export default InventoryTable;