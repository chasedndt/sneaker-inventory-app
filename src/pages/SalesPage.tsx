// src/pages/SalesPage.tsx
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
  InputLabel,
  IconButton,
  Tooltip,
  Chip,
  Checkbox,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import dayjs from 'dayjs';

import SearchBar from '../components/Inventory/SearchBar';
import SalesKPIMetrics from '../components/Sales/SalesKPIMetrics';
import SalesTable from '../components/Sales/SalesTable';
import ColumnCustomizationMenu from '../components/Inventory/ColumnCustomizationMenu';
import RecordSaleModal from '../components/Sales/RecordSaleModal';
import BulkSaleModal from '../components/Sales/BulkSaleModal';

import { Item, api } from '../services/api';
import { salesApi, Sale } from '../services/salesApi';

export interface SalesItem extends Sale {
  itemName: string;
  brand: string;
  category: string;
  size?: string;
  purchasePrice: number;
  profit: number;
  daysToSell: number;
  ROI: number;
  imageUrl?: string;
}

const SalesPage: React.FC = () => {
  const theme = useTheme();
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

  // Fetch sales from API
  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        // First get all inventory items
        const inventoryItems = await api.getItems();
        
        // Then get all sales data
        const salesData = await salesApi.getSales();
        
        // Combine sales data with inventory items to create SalesItems
        const enhancedSales = salesData.map((sale: Sale) => {
          const item = inventoryItems.find((inventoryItem: Item) => inventoryItem.id === sale.itemId);
          
          if (!item) {
            // Handle case where item might have been deleted from inventory
            return {
              ...sale,
              itemName: 'Unknown Item',
              brand: 'Unknown',
              category: 'Unknown',
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
            purchasePrice: item.purchasePrice,
            imageUrl: item.imageUrl,
            profit,
            daysToSell,
            ROI: parseFloat(ROI.toFixed(2))
          };
        });
        
        setSales(enhancedSales);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching sales data:', err);
        setError(`Failed to load sales data: ${err.message}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchSales();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // First get all inventory items
      const inventoryItems = await api.getItems();
      
      // Then get all sales data
      const salesData = await salesApi.getSales();
      
      // Similar processing as in useEffect
      const enhancedSales = salesData.map((sale: Sale) => {
        const item = inventoryItems.find((inventoryItem: Item) => inventoryItem.id === sale.itemId);
        
        if (!item) {
          return {
            ...sale,
            itemName: 'Unknown Item',
            brand: 'Unknown',
            category: 'Unknown',
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
          purchasePrice: item.purchasePrice,
          imageUrl: item.imageUrl,
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

  const handleUpdateStatus = async (saleIds: number[], newStatus: 'pending' | 'needsShipping' | 'completed') => {
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
      setSnackbar({
        open: true,
        message: `Failed to fetch inventory: ${error.message}`,
        severity: 'error'
      });
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
      setSnackbar({
        open: true,
        message: `Failed to prepare sale form: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleBulkSaleModalClose = (refresh = false) => {
    setIsBulkSaleModalOpen(false);
    if (refresh) {
      handleRefresh();
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
              <Button 
                variant="outlined" 
                startIcon={<FileDownloadIcon />}
                size="small"
              >
                Export CSV
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<InsertDriveFileIcon />}
                size="small"
              >
                Export Excel
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<PictureAsPdfIcon />}
                size="small"
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
            </>
          ) : (
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