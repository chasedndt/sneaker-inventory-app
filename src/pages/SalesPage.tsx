// src/pages/SalesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton,
  Tooltip,
  Checkbox,
  SelectChangeEvent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import DeleteIcon from '@mui/icons-material/Delete';

import SearchBar from '../components/Inventory/SearchBar';
import SalesKPIMetrics from '../components/Sales/SalesKPIMetrics';
import SalesTable from '../components/Sales/SalesTable';
import ColumnCustomizationMenu from '../components/Inventory/ColumnCustomizationMenu';
import RecordSaleModal from '../components/Sales/RecordSaleModal';
import BulkSaleModal from '../components/Sales/BulkSaleModal';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import LockedFeature from '../components/common/LockedFeature';

import { Item, api } from '../services/api';
import { salesApi, Sale } from '../services/salesApi';
import { useAuthReady } from '../hooks/useAuthReady';

export interface SalesItem extends Sale {
  itemName: string;
  brand: string;
  category: string;
  size?: string;
  reference?: string; // SKU-ID field
  purchasePrice: number;
  profit: number;
  daysToSell: number;
  ROI: number;
  imageUrl?: string;
  images?: string[];
}

const SalesPage: React.FC = () => {
  const theme = useTheme();
  const { authReady, currentUser } = useAuthReady();
  const accountTier = currentUser?.accountTier || 'Free'; // Derive accountTier

  
  const [sales, setSales] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(0);
  const [selectedSales, setSelectedSales] = useState<number[]>([]);
  const [columnMenuAnchorEl, setColumnMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    image: true,
    itemName: true,
    platform: true,
    saleDate: true,
    salePrice: true,
    tax: true,
    fees: true,
    status: true,
    profit: true,
    brand: true,
    purchaseDate: true,
    purchasePrice: true,
    ROI: true,
    daysToSell: true,
    size: true,
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });
  
  // Modals states
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState<boolean>(false);
  const [isBulkSaleModalOpen, setIsBulkSaleModalOpen] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  
  // Confirmation dialog state for delete/restore
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [salesToDelete, setSalesToDelete] = useState<number[]>([]);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState<boolean>(false);
  const [saleToRestore, setSaleToRestore] = useState<number | null>(null);

  // Fetch sales from API
  useEffect(() => {
    const fetchSalesData = async () => { // Renamed to avoid potential naming conflicts
      if (!authReady) {
        // Auth state not ready yet, wait for the next effect trigger
        setLoading(true); 
        console.log('[SalesPage] Auth not ready, waiting...');
        return;
      }

      if (!currentUser) {
        // Auth check complete, but no user is logged in
        setLoading(false);
        setSales([]); // Clear any existing sales data
        setError('Authentication required to view sales. Please log in.');
        setRefreshing(false);
        return;
      }
      
      // User is authenticated, proceed to fetch data
      try {
        setLoading(true); // Ensure loading is true before fetching
        setError(null); // Clear previous errors
        // First get all inventory items
        const inventoryItems = await api.getItems();
        console.log(`[SalesPage] Retrieved ${inventoryItems.length} inventory items`);
        
        // Then get all sales data
        const salesData = await salesApi.getSales();
        console.log(`[SalesPage] Retrieved ${salesData.length} sales`);
        
        // Combine sales data with inventory items to create SalesItems
        const enhancedSales = salesData.map((sale: Sale) => {
          const item = inventoryItems.find((inventoryItem: Item) => String(inventoryItem.id) === String(sale.itemId));
          
          if (!item) {
            console.warn(`[SalesPage] Could not find item with ID ${sale.itemId} for sale ${sale.id}`);
            console.log(`[SalesPage] Available item IDs:`, inventoryItems.map((item: Item) => item.id));
          }
          
          if (!item) {
            // Handle case where item might have been deleted from inventory
            // Important: Keep size as undefined when item is missing, don't set empty string
            return {
              ...sale,
              itemName: 'Unknown Item',
              brand: 'Unknown',
              category: 'Unknown',
              size: undefined, // Explicitly keep undefined to show missing data
              purchasePrice: 0,
              profit: sale.salePrice - (sale.platformFees || 0) - (sale.salesTax || 0),
              daysToSell: 0,
              ROI: 0
            };
          }
          
          // Calculate profit
          const profit = sale.salePrice - item.purchasePrice - (sale.platformFees || 0) - (sale.salesTax || 0);
          
          // Calculate days to sell
          const purchaseDate = new Date(item.purchaseDate);
          const saleDate = new Date(sale.saleDate);
          const daysToSell = Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Calculate ROI
          const ROI = (profit / item.purchasePrice) * 100;
          
          return {
            ...sale,
            itemName: item.productName,
            brand: item.brand,
            category: item.category,
            size: item.size,
            reference: item.reference, // Include SKU-ID field
            purchasePrice: item.purchasePrice,
            imageUrl: item.imageUrl,
            images: item.images, // Include the images array
            profit,
            daysToSell,
            ROI: parseFloat(ROI.toFixed(2))
          };
        });
        
        setSales(enhancedSales);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching sales data:', err);
        
        // Check for authentication errors
        if (err.message.includes('Authentication') || err.message.includes('Unauthorized')) {
          setError('Authentication required to view sales. Please log in.');
        } else {
          setError(`Failed to load sales data: ${err.message}`);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchSalesData();
  }, [authReady, currentUser, accountTier]);

  const handleRefresh = async () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Authentication required to refresh sales data.',
        severity: 'warning'
      });
      return;
    }
    
    setRefreshing(true);
    try {
      // First get all inventory items
      const inventoryItems = await api.getItems();
      
      // Then get all sales data
      const salesData = await salesApi.getSales();
      
      // Similar processing as in useEffect
      const enhancedSales = salesData.map((sale: Sale) => {
        const item = inventoryItems.find((inventoryItem: Item) => String(inventoryItem.id) === String(sale.itemId));
        
        if (!item) {
          return {
            ...sale,
            itemName: 'Unknown Item',
            brand: 'Unknown',
            category: 'Unknown',
            size: undefined, // Explicitly keep undefined to show missing data
            purchasePrice: 0,
            profit: sale.salePrice - (sale.platformFees || 0) - (sale.salesTax || 0),
            daysToSell: 0,
            ROI: 0
          };
        }
        
        const profit = sale.salePrice - item.purchasePrice - (sale.platformFees || 0) - (sale.salesTax || 0);
        const purchaseDate = new Date(item.purchaseDate);
        const saleDate = new Date(sale.saleDate);
        const daysToSell = Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const ROI = (profit / item.purchasePrice) * 100;
        
        return {
          ...sale,
          itemName: item.productName,
          brand: item.brand,
          category: item.category,
          size: item.size,
          reference: item.reference, // Include SKU-ID field
          purchasePrice: item.purchasePrice,
          imageUrl: item.imageUrl,
          images: item.images, // Include the images array
          profit,
          daysToSell,
          ROI: parseFloat(ROI.toFixed(2))
        };
      });
      
      setSales(enhancedSales);
      setSnackbar({
        open: true,
        message: 'Sales data refreshed successfully',
        severity: 'success'
      });
    } catch (err: any) {
      console.error('Error refreshing sales data:', err);
      
      // Check for authentication errors
      if (err.message.includes('Authentication') || err.message.includes('Unauthorized')) {
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to refresh: ${err.message}`,
          severity: 'error'
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleUpdateStatus = async (saleIds: number[], newStatus: 'pending' | 'needsShipping' | 'completed') => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Authentication required to update sale status.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      // Update UI first for immediate feedback
      setSales(prevSales => 
        prevSales.map(sale => {
          if (saleIds.includes(sale.id)) {
            return {
              ...sale,
              status: newStatus
            };
          }
          return sale;
        })
      );
      
      // Then update on the backend
      for (const saleId of saleIds) {
        await salesApi.updateSaleField(saleId, 'status', newStatus);
      }
      
      setSnackbar({
        open: true,
        message: `${saleIds.length} sale(s) status updated to ${newStatus}`,
        severity: 'success'
      });
      
      // Clear selection after update
      setSelectedSales([]);
    } catch (error: any) {
      console.error('Error updating sale status:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
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
      const allIds = filteredSales.map(sale => sale.id);
      setSelectedSales(allIds);
    } else {
      setSelectedSales([]);
    }
  };

  const handleSelectSale = (saleId: number, checked: boolean) => {
    if (checked) {
      setSelectedSales(prev => [...prev, saleId]);
    } else {
      setSelectedSales(prev => prev.filter(id => id !== saleId));
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
  
  // Record Sale Modal handlers
  const handleOpenRecordSaleModal = async () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Authentication required to record sales.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      // Fetch all unsold inventory items
      const items = await api.getItems();
      const unsoldItems = items.filter((inventoryItem: Item) => inventoryItem.status !== 'sold');
      
      if (unsoldItems.length === 0) {
        setSnackbar({
          open: true,
          message: 'No items available to mark as sold',
          severity: 'info'
        });
        return;
      }
      
      setSelectedItems(unsoldItems);
      setIsRecordSaleModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching inventory items:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to fetch inventory: ${error.message}`,
          severity: 'error'
        });
      }
    }
  };
  
  const handleRecordSaleModalClose = (refresh = false) => {
    setIsRecordSaleModalOpen(false);
    if (refresh) {
      handleRefresh();
    }
  };
  
  // Bulk Sale Modal handlers
  const handleOpenBulkSaleModal = async () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Authentication required to update sales.',
        severity: 'warning'
      });
      return;
    }
    try {
      if (selectedSales.length <= 1) {
        // Get unsold inventory items for normal recording
        const items = await api.getItems();
        const unsoldItems = items.filter((inventoryItem: Item) => inventoryItem.status !== 'sold');
        
        if (unsoldItems.length === 0) {
          setSnackbar({
            open: true,
            message: 'No items available to mark as sold',
            severity: 'info'
          });
          return;
        }
        
        setSelectedItems(unsoldItems);
        setIsRecordSaleModalOpen(true);
      } else {
        // For bulk editing
        setIsBulkSaleModalOpen(true);
      }
    } catch (error: any) {
      console.error('Error preparing for sale recording:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to prepare sale form: ${error.message}`,
          severity: 'error'
        });
      }
    }
  };

  const handleBulkSaleModalClose = (refresh = false) => {
    setIsBulkSaleModalOpen(false);
    if (refresh) {
      handleRefresh();
    }
  };

  // Handle Delete Sale
  const handleDeleteSale = (saleId: number) => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Authentication required to delete sales.',
        severity: 'warning'
      });
      return;
    }
    
    setSalesToDelete([saleId]);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Delete sales on backend
      for (const saleId of salesToDelete) {
        await salesApi.deleteSale(saleId);
      }
      
      // Update UI
      setSales(prevSales => prevSales.filter(sale => !salesToDelete.includes(sale.id)));
      
      setSnackbar({
        open: true,
        message: `${salesToDelete.length} sale(s) deleted successfully`,
        severity: 'success'
      });
      
    } catch (error: any) {
      console.error('Error deleting sales:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete sales: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setDeleteConfirmOpen(false);
      setSalesToDelete([]);
      // Clear selection
      setSelectedSales([]);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSalesToDelete([]);
  };

  // Handle Restore to Inventory
  const handleRestoreToInventory = (saleId: number) => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Authentication required to restore items to inventory.',
        severity: 'warning'
      });
      return;
    }
    
    setSaleToRestore(saleId);
    setRestoreConfirmOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!saleToRestore) return;
    
    try {
      const saleToRestoreData = sales.find(sale => sale.id === saleToRestore);
      
      if (!saleToRestoreData) {
        throw new Error('Sale not found');
      }
      
      // First update the item status back to unlisted
      await api.updateItemField(saleToRestoreData.itemId, 'status', 'unlisted');
      
      // Then delete the sale record
      await salesApi.deleteSale(saleToRestore);
      
      // Update UI by removing the sale
      setSales(prevSales => prevSales.filter(sale => sale.id !== saleToRestore));
      
      // Force refresh the sales data to ensure item data is current
      // This helps resolve any stale data issues with size/item information
      setTimeout(() => {
        handleRefresh();
        
        // Also trigger inventory page refresh if it's loaded
        // This ensures inventory page shows the returned item with proper size data
        const inventoryRefreshEvent = new CustomEvent('inventory-refresh');
        window.dispatchEvent(inventoryRefreshEvent);
        console.log('🔄 [SALES] Triggered inventory refresh after item restore');
      }, 500); // Small delay to ensure backend updates are complete
      
      setSnackbar({
        open: true,
        message: 'Item restored to inventory successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error restoring item to inventory:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to restore item: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setRestoreConfirmOpen(false);
      setSaleToRestore(null);
    }
  };

  const handleRestoreCancel = () => {
    setRestoreConfirmOpen(false);
    setSaleToRestore(null);
  };

  // Handle Bulk Delete Sales
  const handleBulkDeleteSales = (saleIds: number[]) => {
    setSalesToDelete(saleIds);
    setDeleteConfirmOpen(true);
  };

  // Handle Bulk Return to Inventory
  const handleBulkReturnToInventory = async (saleIds: number[]) => {
    try {
      setLoading(true);
      console.log('🔄 Returning multiple sales to inventory:', saleIds);
      
      const result = await salesApi.returnSalesToInventory(saleIds);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully returned ${result.returnedCount} sales to inventory`,
          severity: 'success'
        });
        
        // Clear selection and refresh data
        setSelectedSales([]);
        await handleRefresh();
      }
    } catch (error: any) {
      console.error('💥 Error returning sales to inventory:', error);
      setSnackbar({
        open: true,
        message: `Failed to return sales to inventory: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter sales based on search query
  const filteredSales = useMemo(() => {
    if (!searchQuery) return sales;
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    return sales.filter((sale: SalesItem) => 
      sale.itemName.toLowerCase().includes(lowerCaseQuery) ||
      sale.platform.toLowerCase().includes(lowerCaseQuery) ||
      sale.brand.toLowerCase().includes(lowerCaseQuery) ||
      (sale.saleId && sale.saleId.toLowerCase().includes(lowerCaseQuery))
    );
  }, [sales, searchQuery]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalSalesRevenue = filteredSales.reduce((sum, sale) => sum + sale.salePrice, 0);
    const totalSalesProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalSales = filteredSales.length;
    const avgProfitPerSale = totalSales > 0 ? totalSalesProfit / totalSales : 0;
    
    const pendingShipments = filteredSales.filter(sale => sale.status === 'needsShipping').length;
    const completedSales = filteredSales.filter(sale => sale.status === 'completed').length;
    
    return {
      totalSalesRevenue,
      avgProfitPerSale,
      pendingShipments,
      completedSales,
      totalSales
    };
  }, [filteredSales]);

  // Paginate the filtered sales
  const paginatedSales = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredSales.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSales, page, rowsPerPage]);

  // Display loading or error states if necessary
  if (!authReady) {
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
  
  if (!currentUser && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Authentication required to view sales data. Please log in.
        </Alert>
      </Box>
    );
  }

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

  // Check if user is on free tier - show locked feature instead
  if (accountTier?.toLowerCase() === 'free') {
    return (
      <Box sx={{ py: 3, px: 2, backgroundColor: theme.palette.background.default }}>
        <LockedFeature
          title="Sales Tracking Locked"
          description="Record sales, track revenue, and analyze your profit margins with our sales management tools. Available on Starter and Professional plans."
          ctaText="Upgrade to Starter"
          ctaLink="/settings?section=billing"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3, px: 2, backgroundColor: theme.palette.background.default }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Sales
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
      <SalesKPIMetrics metrics={kpiMetrics} />
      
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
              <Tooltip title={accountTier === 'Free' ? "Export feature available on Starter and Professional plans." : ""}>
                <span> {/* Tooltip needs a span wrapper when child is disabled */} 
                  <Button 
                    variant="outlined" 
                    startIcon={<FileDownloadIcon />}
                    size="small"
                    disabled={accountTier === 'Free'}
                  >
                    Export CSV
                  </Button>
                </span>
              </Tooltip>
              
              <Tooltip title={accountTier === 'Free' ? "Export feature available on Starter and Professional plans." : ""}>
                <span> {/* Tooltip needs a span wrapper when child is disabled */} 
                  <Button 
                    variant="outlined" 
                    startIcon={<InsertDriveFileIcon />}
                    size="small"
                    disabled={accountTier === 'Free'}
                  >
                    Export Excel
                  </Button>
                </span>
              </Tooltip>
              
              <Tooltip title={accountTier === 'Free' ? "Export feature available on Starter and Professional plans." : ""}>
                <span> {/* Tooltip needs a span wrapper when child is disabled */} 
                  <Button 
                    variant="outlined" 
                    startIcon={<PictureAsPdfIcon />}
                    size="small"
                    disabled={accountTier === 'Free'}
                  >
                    Export PDF
                  </Button>
                </span>
              </Tooltip>
              
              <Tooltip title="Customize columns">
                <IconButton onClick={handleColumnMenuOpen}>
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Checkbox 
              checked={selectedSales.length > 0 && selectedSales.length === filteredSales.length}
              indeterminate={selectedSales.length > 0 && selectedSales.length < filteredSales.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <Typography variant="body2" component="span">
              {selectedSales.length > 0 ? `${selectedSales.length} selected` : 'Select all'}
            </Typography>
          </Grid>
          
          {selectedSales.length > 0 ? (
            <>
              {/* Show these buttons when sales are selected */}
              <Grid item>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleOpenBulkSaleModal}
                >
                  {selectedSales.length === 1 ? 'Edit Sale' : 'Bulk Edit'}
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  size="small"
                  color="warning"
                  onClick={() => handleUpdateStatus(selectedSales, 'needsShipping')}
                >
                  Mark as Needs Shipping
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  color="success"
                  size="small"
                  onClick={() => handleUpdateStatus(selectedSales, 'completed')}
                >
                  Mark as Completed
                </Button>
              </Grid>
              
              {/* Bulk action buttons for multiple sales */}
              <Grid item>
                <Button 
                  variant="outlined" 
                  color="primary"
                  size="small"
                  startIcon={<KeyboardReturnIcon />}
                  onClick={() => handleBulkReturnToInventory(selectedSales)}
                >
                  Return to Inventory ({selectedSales.length})
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="outlined" 
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleBulkDeleteSales(selectedSales)}
                >
                  Delete Sales ({selectedSales.length})
                </Button>
              </Grid>
            </>
          ) : (
            <>
              {/* Always show these buttons in the toolbar when no sales are selected */}
              <Grid item>
                <Button 
                  variant="contained" 
                  color="primary"
                  size="small"
                  onClick={handleOpenRecordSaleModal}
                >
                  Record Sale
                </Button>
              </Grid>
              
              <Grid item>
                <Tooltip title="Select sales to return items to inventory">
                  <span>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      size="small"
                      startIcon={<KeyboardReturnIcon />}
                      disabled={true}
                      sx={{ opacity: 0.6 }}
                    >
                      Return to Inventory
                    </Button>
                  </span>
                </Tooltip>
              </Grid>
              
              <Grid item>
                <Tooltip title="Select sales to delete">
                  <span>
                    <Button 
                      variant="outlined" 
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      disabled={true}
                      sx={{ opacity: 0.6 }}
                    >
                      Delete Sales
                    </Button>
                  </span>
                </Tooltip>
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
      
      {/* Sales Table */}
      <SalesTable 
        sales={paginatedSales}
        visibleColumns={visibleColumns}
        selectedSales={selectedSales}
        onSelectSale={handleSelectSale}
        page={page}
        rowsPerPage={rowsPerPage}
        totalSales={filteredSales.length}
        onPageChange={handlePageChange}
        onDeleteSale={handleDeleteSale}
        onRestoreToInventory={handleRestoreToInventory}
      />
      
      {/* Column Customization Menu */}
      <ColumnCustomizationMenu 
        anchorEl={columnMenuAnchorEl}
        open={Boolean(columnMenuAnchorEl)}
        onClose={handleColumnMenuClose}
        columns={visibleColumns}
        onToggleColumn={handleColumnToggle}
      />
      
      {/* Record Sale Modal */}
      <RecordSaleModal
        open={isRecordSaleModalOpen}
        onClose={handleRecordSaleModalClose}
        items={selectedItems}
      />
      
      {/* Bulk Sale Modal */}
      <BulkSaleModal
        open={isBulkSaleModalOpen}
        onClose={handleBulkSaleModalClose}
        sales={selectedSales.map(id => sales.find(sale => sale.id === id)).filter(Boolean) as SalesItem[]}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${salesToDelete.length > 1 ? 'these ' + salesToDelete.length + ' sales' : 'this sale'}? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        confirmButtonColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      
      {/* Restore to Inventory Confirmation Dialog */}
      <ConfirmationDialog
        open={restoreConfirmOpen}
        title="Restore to Inventory"
        message="Are you sure you want to restore this item to your inventory? This will remove the sale record and mark the item as unlisted."
        confirmButtonText="Restore"
        cancelButtonText="Cancel"
        confirmButtonColor="primary"
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
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

export default SalesPage;