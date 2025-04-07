// src/pages/InventoryPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Snackbar, 
  Alert,
  useTheme,
  Grid,
  Divider,
  Button,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  SelectChangeEvent,
  Collapse,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InventoryIcon from '@mui/icons-material/Inventory';
import dayjs from 'dayjs';

import SearchBar from '../components/Inventory/SearchBar';
import KPIMetrics from '../components/Inventory/KPIMetrics';
import InventoryTable from '../components/Inventory/InventoryTable';
import ColumnCustomizationMenu from '../components/Inventory/ColumnCustomizationMenu';
import EditItemModal from '../components/EditItemModal';
import RecordSaleModal from '../components/Sales/RecordSaleModal';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import StockInsights from '../components/Inventory/StockInsights';
import TagManager from '../components/Inventory/TagManager';
import ListItemModal from '../components/Inventory/ListItemModal';
import BatchTagsModal from '../components/Inventory/BatchTagsModal';

import { api, Item } from '../services/api';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';
import { tagService } from '../services/tagService';

export interface InventoryItem extends Item {
  marketPrice: number;
  estimatedProfit: number;
  roi: number;
  daysInInventory: number;
  status: 'unlisted' | 'listed' | 'sold'; // Using 'unlisted' instead of 'in_stock'
  size?: string;
  sizeSystem?: string;
  reference?: string;
  shippingPrice?: number;
  tags?: string[];
  listings?: Array<{
    platform: string;
    price: number;
    url?: string;
    date: string;
    status: 'active' | 'sold' | 'expired';
  }>;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

const calculateDaysInInventory = (purchaseDate: string): number => {
  const purchaseTime = new Date(purchaseDate).getTime();
  const currentTime = new Date().getTime();
  return Math.floor((currentTime - purchaseTime) / (1000 * 60 * 60 * 24));
};

const InventoryPage: React.FC = () => {
  const theme = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(0);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [columnMenuAnchorEl, setColumnMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    image: true,
    name: true,
    category: true,
    marketPrice: true,
    estimatedProfit: true,
    size: true,
    brand: true,
    reference: true,
    sku: true,
    daysInInventory: true,
    roi: true,
    purchaseTotal: true,
    shippingAmount: true,
    status: true,
    tags: true
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });
  
  // Stock insights state
  const [showInsights, setShowInsights] = useState<boolean>(false);
  
  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagManagerOpen, setTagManagerOpen] = useState<boolean>(false);
  const [batchTagsOpen, setBatchTagsOpen] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | undefined>(undefined);
  
  // Record Sale modal state
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState<boolean>(false);
  const [itemsToSell, setItemsToSell] = useState<Item[]>([]);
  
  // List Item modal state
  const [isListItemModalOpen, setIsListItemModalOpen] = useState<boolean>(false);
  const [itemsToList, setItemsToList] = useState<InventoryItem[]>([]);
  
  // Confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [itemsToDelete, setItemsToDelete] = useState<number[]>([]);
  
  // Duplicate dialog state
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState<boolean>(false);
  const [itemToDuplicate, setItemToDuplicate] = useState<InventoryItem | undefined>(undefined);

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await api.getItems();
        
        // Filter out sold items for inventory page
        const filteredItems = data.filter((item: Item) => item.status !== 'sold');
        
        // Enhance items with additional calculated fields
        const enhancedItems = filteredItems.map((item: Item) => {
          // For market price, use the stored value if available or calculate a default
          const marketPrice = item.marketPrice || (item.purchasePrice * 1.2); // 20% markup as default
          const estimatedProfit = marketPrice - item.purchasePrice;
          const roi = (estimatedProfit / item.purchasePrice) * 100;
          const daysInInventory = calculateDaysInInventory(item.purchaseDate);
          
          // Use 'unlisted' as the default status if none is provided
          const status = item.status || 'unlisted';
          
          return {
            ...item,
            marketPrice: parseFloat(marketPrice.toFixed(2)),
            estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
            roi: parseFloat(roi.toFixed(2)),
            daysInInventory,
            status: status as 'unlisted' | 'listed' | 'sold',
            // Make sure to include size and sizeSystem - may be undefined
            size: item.size,
            sizeSystem: item.sizeSystem,
            tags: item.tags || []
          };
        });
        
        setItems(enhancedItems);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching inventory items:', err);
        setError(`Failed to load inventory data: ${err.message}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchItems();

    // Also fetch tags
    const fetchTags = async () => {
      try {
        const tags = await tagService.getTags();
        setTags(tags);
      } catch (err: any) {
        console.error('Error fetching tags:', err);
      }
    };

    fetchTags();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getItems();
      
      // Filter out sold items
      const filteredItems = data.filter((item: Item) => item.status !== 'sold');
      
      // Enhance items with additional calculated fields (similar to useEffect)
      const enhancedItems = filteredItems.map((item: Item) => {
        // Use stored values for marketPrice and status if available
        const marketPrice = item.marketPrice || (item.purchasePrice * 1.2);
        const estimatedProfit = marketPrice - item.purchasePrice;
        const roi = (estimatedProfit / item.purchasePrice) * 100;
        const daysInInventory = calculateDaysInInventory(item.purchaseDate);
        const status = item.status || 'unlisted';
        
        return {
          ...item,
          marketPrice: parseFloat(marketPrice.toFixed(2)),
          estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
          roi: parseFloat(roi.toFixed(2)),
          daysInInventory,
          status: status as 'unlisted' | 'listed' | 'sold',
          size: item.size,
          sizeSystem: item.sizeSystem,
          tags: item.tags || []
        };
      });
      
      // Also refresh tags
      const tags = await tagService.getTags();
      setTags(tags);
      
      setItems(enhancedItems);
      setSnackbar({
        open: true,
        message: 'Inventory refreshed successfully',
        severity: 'success'
      });
    } catch (err: any) {
      console.error('Error refreshing inventory items:', err);
      setSnackbar({
        open: true,
        message: `Failed to refresh: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleUpdateMarketPrice = async (itemId: number, newPrice: number) => {
    try {
      // First update UI for immediate feedback
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.id === itemId) {
            const estimatedProfit = newPrice - item.purchasePrice;
            const roi = (estimatedProfit / item.purchasePrice) * 100;
            
            return {
              ...item,
              marketPrice: newPrice,
              estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
              roi: parseFloat(roi.toFixed(2))
            };
          }
          return item;
        })
      );
      
      // Then persist to backend
      await api.updateItemField(itemId, 'marketPrice', newPrice);
      
      setSnackbar({
        open: true,
        message: 'Market price updated successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error updating market price:', error);
      setSnackbar({
        open: true,
        message: `Failed to update market price: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // New handler for marking items as unlisted
  const handleMarkAsUnlisted = async () => {
    try {
      // First update UI for immediate feedback
      setItems(prevItems => 
        prevItems.map(item => {
          if (selectedItems.includes(item.id)) {
            return {
              ...item,
              status: 'unlisted',
              listings: [] // Clear any listings
            };
          }
          return item;
        })
      );
      
      // Then persist to backend
      for (const itemId of selectedItems) {
        // Update item status to unlisted
        await api.updateItemField(itemId, 'status', 'unlisted');
        // Clear listings
        await api.updateItemField(itemId, 'listings', []);
      }
      
      setSnackbar({
        open: true,
        message: `${selectedItems.length} item(s) marked as unlisted`,
        severity: 'success'
      });
      
      // Clear selection after status update
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error marking as unlisted:', error);
      setSnackbar({
        open: true,
        message: `Failed to mark as unlisted: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleUpdateStatus = async (itemIds: number[], newStatus: 'unlisted' | 'listed' | 'sold') => {
    try {
      // If marking as sold, open RecordSaleModal
      if (newStatus === 'sold') {
        // Get the selected items to sell
        const itemsToSell = items.filter(item => itemIds.includes(item.id));
        setItemsToSell(itemsToSell);
        setIsRecordSaleModalOpen(true);
        return;
      }
      
      // If marking as listed, open ListItemModal
      if (newStatus === 'listed') {
        const itemsToList = items.filter(item => itemIds.includes(item.id));
        setItemsToList(itemsToList);
        setIsListItemModalOpen(true);
        return;
      }
      
      // For other status updates
      // First update UI for immediate feedback
      setItems(prevItems => 
        prevItems.map(item => {
          if (itemIds.includes(item.id)) {
            return {
              ...item,
              status: newStatus
            };
          }
          return item;
        })
      );
      
      // Then persist to backend
      for (const itemId of itemIds) {
        await api.updateItemField(itemId, 'status', newStatus);
      }
      
      setSnackbar({
        open: true,
        message: `${itemIds.length} item(s) marked as ${newStatus}`,
        severity: 'success'
      });
      
      // Clear selection after status update
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error updating status:', error);
      setSnackbar({
        open: true,
        message: `Failed to update status: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(0); // Reset to first page when search changes
  };

  const handleRowsPerPageChange = (event: SelectChangeEvent<number>) => {
    setRowsPerPage(parseInt(event.target.value.toString(), 10));
    setPage(0); // Reset to first page when rows per page changes
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredItems.map(item => item.id);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnMenuAnchorEl(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchorEl(null);
  };

  const handleColumnToggle = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  // Edit item handlers
  const handleEditItem = () => {
    if (selectedItems.length === 1) {
      const itemToEdit = items.find(item => item.id === selectedItems[0]);
      setItemToEdit(itemToEdit);
      setIsEditModalOpen(true);
    } else if (selectedItems.length > 1) {
      // For bulk edit, we don't set a specific item
      setItemToEdit(undefined);
      setIsEditModalOpen(true);
    }
  };
  
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setItemToEdit(undefined);
    // Refresh data after edit
    handleRefresh();
  };
  
  // Delete functionality
  const handleDeleteClick = () => {
    if (selectedItems.length === 0) return;
    setItemsToDelete(selectedItems);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      // Delete items from backend
      for (const itemId of itemsToDelete) {
        await api.deleteItem(itemId);
      }
      
      // Update UI
      setItems(prevItems => prevItems.filter(item => !itemsToDelete.includes(item.id)));
      
      setSnackbar({
        open: true,
        message: `${itemsToDelete.length} item(s) deleted successfully`,
        severity: 'success'
      });
      
      // Clear selection
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error deleting items:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete items: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setItemsToDelete([]);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemsToDelete([]);
  };
  
  // Record Sale modal handlers
  const handleRecordSaleModalClose = (refresh = false) => {
    setIsRecordSaleModalOpen(false);
    if (refresh) {
      handleRefresh();
    }
  };
  
  // List Item modal handlers
  const handleListItemModalClose = (refresh = false) => {
    setIsListItemModalOpen(false);
    if (refresh) {
      handleRefresh();
    }
  };
  
  // Duplicate item functionality
  const handleDuplicateItem = (item: InventoryItem) => {
    setItemToDuplicate(item);
    setDuplicateConfirmOpen(true);
  };
  
  const handleDuplicateConfirm = async () => {
    if (!itemToDuplicate) return;
    
    try {
      // Clone the item without the id
      const { id, ...itemWithoutId } = itemToDuplicate;
      
      // Set the new name to indicate it's a duplicate
      const newItem = {
        productDetails: {
          category: itemToDuplicate.category as any,
          productName: `${itemToDuplicate.productName} (Copy)`,
          reference: itemToDuplicate.reference || '',
          colorway: itemToDuplicate.colorway || '',
          brand: itemToDuplicate.brand
        },
        sizesQuantity: {
          sizeSystem: itemToDuplicate.sizeSystem || '',
          selectedSizes: [{
            system: itemToDuplicate.sizeSystem || '',
            size: itemToDuplicate.size || '',
            quantity: '1'
          }]
        },
        purchaseDetails: {
          purchasePrice: itemToDuplicate.purchasePrice.toString(),
          purchaseCurrency: 'USD',
          shippingPrice: (itemToDuplicate.shippingPrice || 0).toString(),
          shippingCurrency: 'USD',
          marketPrice: (itemToDuplicate.marketPrice || 0).toString(),
          purchaseDate: itemToDuplicate.purchaseDate,
          purchaseLocation: itemToDuplicate.purchaseLocation || '',
          condition: itemToDuplicate.condition || '',
          notes: itemToDuplicate.notes || '',
          orderID: itemToDuplicate.orderID || '',
          tags: itemToDuplicate.tags || [],
          taxType: 'none' as 'none' | 'vat' | 'salesTax',
          vatPercentage: '0',
          salesTaxPercentage: '0'
        }
      };
      
      // Call the API to create a new item
      const result = await api.addItem(newItem, []); // Empty array for images (we're not copying images)
      
      // Update the UI
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: 'Item duplicated successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error duplicating item:', error);
      setSnackbar({
        open: true,
        message: `Failed to duplicate item: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDuplicateConfirmOpen(false);
      setItemToDuplicate(undefined);
    }
  };
  
  const handleDuplicateCancel = () => {
    setDuplicateConfirmOpen(false);
    setItemToDuplicate(undefined);
  };
  
  // Tag management
  const handleOpenTagManager = () => {
    setTagManagerOpen(true);
  };
  
  const handleCloseTagManager = (tagsChanged = false) => {
    setTagManagerOpen(false);
    if (tagsChanged) {
      handleRefresh();
    }
  };
  
  // Batch tags functionality
  const handleOpenBatchTags = () => {
    if (selectedItems.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select items to manage tags',
        severity: 'warning'
      });
      return;
    }
    
    setBatchTagsOpen(true);
  };
  
  const handleCloseBatchTags = (tagsChanged = false) => {
    setBatchTagsOpen(false);
    if (tagsChanged) {
      handleRefresh();
    }
  };
  
  // Tag filtering
  const handleTagFilter = (tagId: string | null) => {
    setSelectedTag(tagId);
    setPage(0); // Reset to first page when filter changes
  };

  // Export functionality
  const handleExportCSV = () => {
    exportToCSV(filteredItems, 'inventory');
    setSnackbar({
      open: true,
      message: 'Inventory exported to CSV successfully',
      severity: 'success'
    });
  };
  
  const handleExportExcel = () => {
    exportToExcel(filteredItems, 'inventory');
    setSnackbar({
      open: true,
      message: 'Inventory exported to Excel successfully',
      severity: 'success'
    });
  };
  
  const handleExportPDF = () => {
    exportToPDF(filteredItems, 'inventory');
    setSnackbar({
      open: true,
      message: 'Inventory exported to PDF successfully',
      severity: 'success'
    });
  };

  // Filter items based on search query and selected tag
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // Apply search filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(lowerCaseQuery) ||
        item.category.toLowerCase().includes(lowerCaseQuery) ||
        item.brand.toLowerCase().includes(lowerCaseQuery) ||
        (item.reference && item.reference.toLowerCase().includes(lowerCaseQuery))
      );
    }
    
    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter(item => 
        item.tags && item.tags.includes(selectedTag)
      );
    }
    
    return filtered;
  }, [items, searchQuery, selectedTag]);

  // Calculate KPI metrics with 'unlisted' status
  const kpiMetrics = useMemo(() => {
    const totalItems = filteredItems.length;
    const unlistedItems = filteredItems.filter(item => item.status === 'unlisted').length;
    const listedItems = filteredItems.filter(item => item.status === 'listed').length;
    const soldItems = filteredItems.filter(item => item.status === 'sold').length;
    
    const totalPurchaseValue = filteredItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    const totalShippingValue = filteredItems.reduce((sum, item) => sum + (item.shippingPrice || 0), 0);
    const totalMarketValue = filteredItems.reduce((sum, item) => sum + item.marketPrice, 0);
    const totalEstimatedProfit = filteredItems.reduce((sum, item) => sum + item.estimatedProfit, 0);
    
    return {
      totalItems,
      unlistedItems,
      listedItems,
      soldItems,
      totalPurchaseValue,
      totalShippingValue,
      totalMarketValue,
      totalEstimatedProfit
    };
  }, [filteredItems]);

  // Paginate the filtered items
  const paginatedItems = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  // Get tag colors map
  const tagColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    tags.forEach(tag => {
      colorMap[tag.id] = tag.color;
    });
    return colorMap;
  }, [tags]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3, px: 2, backgroundColor: theme.palette.background.default }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Inventory
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>
      
      {/* KPI Metrics Section */}
      <KPIMetrics metrics={kpiMetrics} />
      
      {/* Stock Insights Toggle */}
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="outlined"
          startIcon={showInsights ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowInsights(!showInsights)}
          fullWidth
        >
          {showInsights ? 'Hide Stock Insights' : 'Show Stock Insights'}
        </Button>
      </Box>
      
      {/* Stock Insights */}
      <Collapse in={showInsights}>
        <StockInsights items={items} />
      </Collapse>
      
      {/* Search and Actions Section */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <SearchBar value={searchQuery} onChange={handleSearchChange} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<FileDownloadIcon />}
                size="small"
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<InsertDriveFileIcon />}
                size="small"
                onClick={handleExportExcel}
              >
                Export Excel
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<PictureAsPdfIcon />}
                size="small"
                onClick={handleExportPDF}
              >
                Export PDF
              </Button>
              
              <Tooltip title="Customize columns">
                <IconButton onClick={handleColumnMenuOpen}>
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Tag filter row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Button 
            variant={selectedTag === null ? "contained" : "outlined"}
            size="small"
            onClick={() => handleTagFilter(null)}
          >
            All Items
          </Button>
          
          {tags.map(tag => (
            <Button
              key={tag.id}
              variant={selectedTag === tag.id ? "contained" : "outlined"}
              size="small"
              onClick={() => handleTagFilter(tag.id)}
              sx={{ 
                backgroundColor: selectedTag === tag.id ? tag.color : 'transparent',
                borderColor: tag.color,
                color: selectedTag === tag.id ? 'white' : tag.color,
                '&:hover': {
                  backgroundColor: selectedTag === tag.id ? tag.color : `${tag.color}22`,
                }
              }}
              startIcon={<LocalOfferIcon />}
            >
              {tag.name}
            </Button>
          ))}
          
          <Button
            variant="outlined"
            size="small"
            onClick={handleOpenTagManager}
            startIcon={<LocalOfferIcon />}
          >
            Manage Tags
          </Button>
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={selectedItems.length > 0 && selectedItems.length === filteredItems.length}
                  indeterminate={selectedItems.length > 0 && selectedItems.length < filteredItems.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  {selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select all'}
                </Typography>
              }
            />
          </Grid>
          
          {selectedItems.length > 0 && (
            <>
              <Grid item>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleEditItem}
                >
                  {selectedItems.length === 1 ? 'Edit Item' : 'Bulk Edit'}
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<LocalOfferIcon />}
                  onClick={handleOpenBatchTags}
                >
                  Manage Tags
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<ShoppingBasketIcon />}
                  onClick={() => handleUpdateStatus(selectedItems, 'listed')}
                >
                  Mark as Listed
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<InventoryIcon />}
                  onClick={handleMarkAsUnlisted}
                >
                  Mark as Unlisted
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  color="success"
                  size="small"
                  onClick={() => handleUpdateStatus(selectedItems, 'sold')}
                >
                  Mark as Sold
                </Button>
              </Grid>
              
              {selectedItems.length === 1 && (
                <Grid item>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => {
                      const item = items.find(item => item.id === selectedItems[0]);
                      if (item) handleDuplicateItem(item);
                    }}
                  >
                    Duplicate Item
                  </Button>
                </Grid>
              )}
              
              <Grid item>
                <Button 
                  variant="contained" 
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                >
                  Delete
                </Button>
              </Grid>
            </>
          )}
          
          <Grid item sx={{ ml: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                Rows per page:
              </Typography>
              <FormControl size="small" variant="outlined">
                <Select
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Inventory Table */}
      <InventoryTable 
        items={paginatedItems}
        visibleColumns={visibleColumns}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onUpdateMarketPrice={handleUpdateMarketPrice}
        onDuplicateItem={handleDuplicateItem}
        page={page}
        rowsPerPage={rowsPerPage}
        totalItems={filteredItems.length}
        onPageChange={handlePageChange}
        tagColorMap={tagColorMap}
        tags={tags}
      />
      
      {/* Column Customization Menu */}
      <ColumnCustomizationMenu 
        anchorEl={columnMenuAnchorEl}
        open={Boolean(columnMenuAnchorEl)}
        onClose={handleColumnMenuClose}
        columns={visibleColumns}
        onToggleColumn={handleColumnToggle}
      />
      
      {/* Edit Item Modal */}
      <EditItemModal 
        open={isEditModalOpen}
        onClose={handleEditModalClose}
        item={itemToEdit}
        isMultiple={selectedItems.length > 1}
      />
      
      {/* Record Sale Modal */}
      <RecordSaleModal
        open={isRecordSaleModalOpen}
        onClose={handleRecordSaleModalClose}
        items={itemsToSell}
      />
      
      {/* List Item Modal */}
      <ListItemModal
        open={isListItemModalOpen}
        onClose={handleListItemModalClose}
        items={itemsToList}
      />
      
      {/* Tag Manager Dialog */}
      <TagManager
        open={tagManagerOpen}
        onClose={handleCloseTagManager}
        tags={tags}
      />
      
      {/* Batch Tags Modal */}
      <BatchTagsModal
        open={batchTagsOpen}
        onClose={handleCloseBatchTags}
        itemIds={selectedItems}
        tags={tags}
      />
      
      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${itemsToDelete.length > 1 ? 'these ' + itemsToDelete.length + ' items' : 'this item'}? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        confirmButtonColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      
      {/* Confirmation Dialog for Duplicate */}
      <ConfirmationDialog
        open={duplicateConfirmOpen}
        title="Confirm Duplicate"
        message={`Are you sure you want to duplicate "${itemToDuplicate?.productName}"? This will create a new unlisted item with the same details.`}
        confirmButtonText="Duplicate"
        cancelButtonText="Cancel"
        confirmButtonColor="primary"
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateCancel}
      />
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryPage;