// src/pages/InventoryPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Fab,
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
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
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
import AddItemModal from '../components/AddItemModal';
import InventoryFilter, { ActiveFilter } from '../components/Inventory/InventoryFilter';

import { api, Item, useApi } from '../services/api';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';
import { tagService } from '../services/tagService';
import { useAuth } from '../contexts/AuthContext';
import { useApiConnection } from '../hooks/useApiConnection';
import { useSettings } from '../contexts/SettingsContext';
import { currencyConverter } from '../utils/currencyUtils';

export interface InventoryItem extends Item {
  marketPrice: number;
  marketPriceCurrency?: string; // Added to support currency tracking for market prices
  estimatedProfit: number;
  roi: number;
  daysInInventory: number;
  status: 'unlisted' | 'listed' | 'sold'; // Using 'unlisted' instead of 'in_stock'
  size?: string;
  sizeSystem?: string;
  reference?: string;
  shippingPrice?: number;
  tags?: string[];
  purchaseDetails?: {
    purchaseCurrency?: string;
    [key: string]: any;
  };
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
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { isAuthenticated, loading: apiLoading } = useApi();
  const { currency: defaultCurrency } = useSettings();
  const { 
    isConnected, 
    connectionError, 
    checkConnection, 
    resetConnectionState,
    stopRetrying,
    isCheckingConnection 
  } = useApiConnection();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [connectionRetryCount, setConnectionRetryCount] = useState<number>(0);
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
    daysInInventory: false, // Set to false by default
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
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
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
  
  // Add Item modal state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  
  // Active filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  
  // Cooldown state to prevent infinite error loops
  const [authErrorCooldown, setAuthErrorCooldown] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login', { 
        state: { 
          from: '/inventory',
          message: 'Please log in to view your inventory' 
        } 
      });
    }
  }, [authLoading, currentUser, navigate]);

  // Define fetchItems function outside of useEffect for better code organization
  const fetchItems = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      
      // Don't show the error snackbar while actively checking for connection
      setError(null);
      
      // Check API connection using our hook - only proceed if connected
      const connected = await checkConnection();
      if (!connected) {
        // Connection error is managed by the hook
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('🔍 [INVENTORY DEBUG] Beginning inventory data fetch');
      const data = await api.getItems();
      
      // Add deep logging of the raw data received from API
      console.log('🔍 [INVENTORY DEBUG] RAW API DATA:', data);
      
      // Log individual item details to see their raw values
      data.forEach((item: Item) => {
        // Create a safe list of all properties including debug fields
        const allProps: Record<string, any> = {};
        Object.keys(item).forEach(key => {
          allProps[key] = (item as any)[key];
        });
        
        console.log(`🔍 [INVENTORY RAW ITEM] ID ${item.id} (${item.productName}):`, {
          marketPrice: item.marketPrice,
          marketPriceType: typeof item.marketPrice,
          propertyNames: Object.keys(item), // Log all property names
          allProps: allProps  // All properties including debug fields
        });
      });
      
      // Filter out sold items for inventory page
      const filteredItems = data.filter((item: Item) => item.status !== 'sold');
      
      // Enhance items with additional calculated fields
      const enhancedItems = filteredItems.map((item: Item) => {
        // Log detailed item properties before processing
        console.log(`🔍 [INVENTORY PROCESS] Item ${item.id} (${item.productName}) BEFORE calculation:`, {
          rawItem: item,
          productName: item.productName,
          marketPrice: item.marketPrice,
          purchasePrice: item.purchasePrice,
          status: item.status,
          marketPriceSource: item.marketPrice ? 'database' : 'calculated'
        });
        
        // Look for any hidden or alternative market price fields that might be in the data
        Object.keys(item).forEach(key => {
          const value = (item as any)[key];
          if (typeof value === 'number' && (key.includes('market') || key.includes('price')) && key !== 'marketPrice' && key !== 'purchasePrice') {
            console.log(`🔍 [POTENTIAL MARKET PRICE FIELD] Found in item ${item.id}: ${key} = ${value}`);
          }
        });
        
        // Log BEFORE the default calculation is applied
        console.log(`🔍 [MARKET PRICE LOGIC CHECK] For item ${item.id}: marketPrice=${item.marketPrice}, using default calculation=${!item.marketPrice}, calculation=${item.purchasePrice * 1.2}`);
        
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
      // Provide more specific error messages based on error type
      if (err.message.includes('Authentication')) {
        setError('Authentication error: Please log in again.');
      } else {
        setError(`Failed to load inventory data: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Define fetchTags function
  const fetchTags = async () => {
    if (!isAuthenticated) return;
    
    try {
      const tagsData = await tagService.getTags();
      setTags(tagsData);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
      // Don't set the main error state for tags - we can proceed without them
    }
  };
  
  // Fetch items when the component mounts and the user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchItems();
      fetchTags();
    }
    
    // Reset connection state when component is unmounted
    return () => {
      resetConnectionState();
      stopRetrying();
    };
  }, [isAuthenticated, authLoading, resetConnectionState, stopRetrying]);

  useEffect(() => {
    // If connection was restored, try fetching items again
    if (isConnected && !isCheckingConnection) {
      // If we previously had connection errors but now we're connected
      if (error || connectionError) {
        // Short delay to ensure the connection is stable
        const timer = setTimeout(() => {
          fetchItems();
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isConnected, error, connectionError, fetchItems, isCheckingConnection]);

  useEffect(() => {
    // Only show error if we're not actively checking connection
    if (!isCheckingConnection) {
      // Use connection error from the hook if available
      const currentError = connectionError || error;
      if (currentError) {
        setSnackbar({
          open: true,
          message: currentError,
          severity: 'error'
        });
      } else if (snackbar.open && snackbar.severity === 'error') {
        // Clear any existing error messages if there's no error
        setSnackbar({
          open: false,
          message: '',
          severity: 'success'
        });
      }
    }
  }, [error, connectionError, isCheckingConnection, snackbar]);

  const handleRefresh = async () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to refresh inventory',
        severity: 'warning'
      });
      return;
    }
    
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

  // Handle market price updates with currency specification
  const handleUpdateMarketPrice = async (itemId: number, newPrice: number, currency?: string) => {
    // Use the settings currency if none provided
    // Make sure we're using currency codes (USD, GBP, EUR) not symbols (£, $, €)
    let priceCurrency = currency || defaultCurrency || 'GBP';
    
    // Convert currency symbols to currency codes if needed
    if (priceCurrency === '£') priceCurrency = 'GBP';
    if (priceCurrency === '$') priceCurrency = 'USD';
    if (priceCurrency === '€') priceCurrency = 'EUR';
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to update market price',
        severity: 'warning'
      });
      return;
    }
    
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
      
      // Then persist to backend with currency information
      console.log(`🔄 [MARKET PRICE API CALL] Updating market price for item ${itemId} to ${newPrice} ${priceCurrency}`);
      await api.updateMarketPrice(itemId, newPrice, priceCurrency);
      
      setSnackbar({
        open: true,
        message: 'Market price updated successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error updating market price:', error);
      
      // If it's an authentication error, show specific message
      if (error.message.includes('Authentication') || error.message.includes('log in')) {
        setSnackbar({
          open: true,
          message: 'Authentication error: Please log in again',
          severity: 'error'
        });
        
        // Redirect to login if authentication failed
        navigate('/login', { 
          state: { 
            from: '/inventory',
            message: 'Your session has expired. Please log in again.' 
          } 
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to update market price: ${error.message}`,
          severity: 'error'
        });
      }
      
      // Refresh to ensure UI is in sync with backend
      handleRefresh();
    }
  };

  // New handler for marking items as unlisted
  const handleMarkAsUnlisted = async () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to update items',
        severity: 'warning'
      });
      return;
    }
    
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
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('log in')) {
        setSnackbar({
          open: true,
          message: 'Authentication error: Please log in again',
          severity: 'error'
        });
        
        navigate('/login', { 
          state: { 
            from: '/inventory',
            message: 'Your session has expired. Please log in again.' 
          } 
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to mark as unlisted: ${error.message}`,
          severity: 'error'
        });
      }
      
      // Refresh to ensure UI is in sync with backend
      handleRefresh();
    }
  };

  const handleUpdateStatus = async (itemIds: number[], newStatus: 'unlisted' | 'listed' | 'sold') => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to update items',
        severity: 'warning'
      });
      return;
    }
    
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
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('log in')) {
        setSnackbar({
          open: true,
          message: 'Authentication error: Please log in again',
          severity: 'error'
        });
        
        navigate('/login', { 
          state: { 
            from: '/inventory',
            message: 'Your session has expired. Please log in again.' 
          } 
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to update status: ${error.message}`,
          severity: 'error'
        });
      }
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
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to edit items',
        severity: 'warning'
      });
      return;
    }
    
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
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to delete items',
        severity: 'warning'
      });
      return;
    }
    
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
      
      // Check for authentication errors
      if (error.message.includes('Authentication') || error.message.includes('log in')) {
        setSnackbar({
          open: true,
          message: 'Authentication error: Please log in again',
          severity: 'error'
        });
        
        navigate('/login', { 
          state: { 
            from: '/inventory',
            message: 'Your session has expired. Please log in again.' 
          } 
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete items: ${error.message}`,
          severity: 'error'
        });
      }
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
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to duplicate items',
        severity: 'warning'
      });
      return;
    }
    
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
          // Important fix: Don't copy tags from the original item
          tags: [], // Set empty array to prevent tag inheritance
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
      
      // Check for authentication errors
      if (error.message.includes('Authentication') || error.message.includes('log in')) {
        setSnackbar({
          open: true,
          message: 'Authentication error: Please log in again',
          severity: 'error'
        });
        
        navigate('/login', { 
          state: { 
            from: '/inventory',
            message: 'Your session has expired. Please log in again.' 
          } 
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to duplicate item: ${error.message}`,
          severity: 'error'
        });
      }
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
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to manage tags',
        severity: 'warning'
      });
      return;
    }
    
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
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to manage tags',
        severity: 'warning'
      });
      return;
    }
    
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

  // Handle filter changes
  const handleFilterChange = (filters: ActiveFilter[]) => {
    setActiveFilters(filters);
    setPage(0); // Reset to first page when filters change
  };

  // Add Item Modal handlers
  const handleOpenAddItemModal = () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to add items',
        severity: 'warning'
      });
      return;
    }
    
    setIsAddItemModalOpen(true);
  };

  const handleCloseAddItemModal = () => {
    setIsAddItemModalOpen(false);
    handleRefresh(); // Refresh to show the new item
  };
  
  // Extract available brands for the brand filter
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    items.forEach(item => {
      if (item.brand) {
        brands.add(item.brand);
      }
    });
    return Array.from(brands).sort();
  }, [items]);

  // Export functionality
  const handleExportCSV = () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to export data',
        severity: 'warning'
      });
      return;
    }
    
    exportToCSV(filteredItems, 'inventory');
    setSnackbar({
      open: true,
      message: 'Inventory exported to CSV successfully',
      severity: 'success'
    });
  };
  
  const handleExportExcel = () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to export data',
        severity: 'warning'
      });
      return;
    }
    
    exportToExcel(filteredItems, 'inventory');
    setSnackbar({
      open: true,
      message: 'Inventory exported to Excel successfully',
      severity: 'success'
    });
  };
  
  const handleExportPDF = () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Please log in to export data',
        severity: 'warning'
      });
      return;
    }
    
    exportToPDF(filteredItems, 'inventory');
    setSnackbar({
      open: true,
      message: 'Inventory exported to PDF successfully',
      severity: 'success'
    });
  };

  // Filter items based on search query, selected tag, and active filters
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
    
    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(item => {
        // Item must match all active filters to be included
        return activeFilters.every(filter => {
          switch (filter.type) {
            case 'category':
              return item.category === filter.value;
            case 'brand':
              return item.brand === filter.value;
            case 'status':
              return item.status === filter.value;
            default:
              return true;
          }
        });
      });
    }
    
    return filtered;
  }, [items, searchQuery, selectedTag, activeFilters]);

  // Calculate KPI metrics with 'unlisted' status
  const kpiMetrics = useMemo(() => {
    const totalItems = filteredItems.length;
    const unlistedItems = filteredItems.filter(item => item.status === 'unlisted').length;
    const listedItems = filteredItems.filter(item => item.status === 'listed').length;
    const soldItems = filteredItems.filter(item => item.status === 'sold').length;
    
    const totalPurchaseValue = filteredItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    const totalShippingValue = filteredItems.reduce((sum, item) => sum + (item.shippingPrice || 0), 0);
    // Convert all market prices to the current currency before summing
    const totalMarketValue = filteredItems.reduce((sum, item) => {
      // If item has marketPriceCurrency, convert to current currency
      if (item.marketPriceCurrency) {
        const convertedPrice = currencyConverter(item.marketPrice, item.marketPriceCurrency, defaultCurrency || 'GBP');
        return sum + convertedPrice;
      }
      // Otherwise just add the price (assuming it's already in the correct currency)
      return sum + item.marketPrice;
    }, 0);
    // Recalculate estimated profit with proper currency conversion
    const totalEstimatedProfit = filteredItems.reduce((sum, item) => {
      let marketPrice = item.marketPrice;
      
      // Convert market price to current currency if needed
      if (item.marketPriceCurrency && item.marketPriceCurrency !== defaultCurrency) {
        marketPrice = currencyConverter(item.marketPrice, item.marketPriceCurrency, defaultCurrency || 'GBP');
      }
      
      // Convert purchase price if it has a different currency
      let purchasePrice = item.purchasePrice;
      const purchaseCurrency = item.purchaseDetails?.purchaseCurrency || 'GBP';
      if (purchaseCurrency !== defaultCurrency) {
        purchasePrice = currencyConverter(item.purchasePrice, purchaseCurrency, defaultCurrency || 'GBP');
      }
      
      // Calculate profit in the current currency
      const profit = marketPrice - purchasePrice;
      return sum + profit;
    }, 0);
    
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

  // Loading states with authentication context
  if (authLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Checking authentication...
        </Typography>
      </Box>
    );
  }
  
  // If not authenticated, show login prompt
  if (!isAuthenticated && !authLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        p: 3 
      }}>
        <Alert 
          severity="warning" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<LoginIcon />}
              onClick={() => navigate('/login', { state: { from: '/inventory' } })}
            >
              Log In
            </Button>
          }
          sx={{ mb: 3, width: '100%', maxWidth: 500 }}
        >
          You need to be logged in to view your inventory
        </Alert>
      </Box>
    );
  }
  
  // Show loading spinner when fetching inventory data
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

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRefresh}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3, px: 2, backgroundColor: theme.palette.background.default }}>
      {/* Header Section with Add Item Button */}
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
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddItemModal}
            sx={{
              borderRadius: 2,
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            Add Item
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <SearchBar value={searchQuery} onChange={handleSearchChange} />
              <InventoryFilter 
                onFilterChange={handleFilterChange}
                activeFilters={activeFilters}
                availableBrands={availableBrands}
              />
            </Box>
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
      
      {/* Add Item Modal */}
      <AddItemModal 
        open={isAddItemModalOpen}
        onClose={handleCloseAddItemModal}
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