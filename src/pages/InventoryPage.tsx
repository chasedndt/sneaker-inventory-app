// src/pages/InventoryPage.tsx
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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import SearchBar from '../components/Inventory/SearchBar'; 
import KPIMetrics from '../components/Inventory/KPIMetrics';
import InventoryTable from '../components/Inventory/InventoryTable';
import ColumnCustomizationMenu from '../components/Inventory/ColumnCustomizationMenu';

import { api, Item } from '../services/api';

export interface InventoryItem extends Item {
    marketPrice: number;
    estimatedProfit: number;
    roi: number;
    daysInInventory: number;
    status: 'in_stock' | 'listed' | 'sold';
    // Add these missing properties
    size?: string;           // Make it optional with '?'
    reference?: string;      // Make it optional with '?'
    shippingPrice?: number;  // Make it optional with '?'
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
    status: true
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await api.getItems();
        
        // Enhance items with additional calculated fields
        const enhancedItems = data.map((item: Item) => {
            // For this prototype, generate random market price based on purchase price
            const marketPrice = item.purchasePrice * (Math.random() * (1.5 - 0.8) + 0.8);
            const estimatedProfit = marketPrice - item.purchasePrice;
            const roi = (estimatedProfit / item.purchasePrice) * 100;
            const daysInInventory = calculateDaysInInventory(item.purchaseDate);
            
            // Generate random status (in real app, this would come from backend)
            const statuses: ('in_stock' | 'listed' | 'sold')[] = ['in_stock', 'listed', 'sold'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            return {
              ...item,
              marketPrice: parseFloat(marketPrice.toFixed(2)),
              estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
              roi: parseFloat(roi.toFixed(2)),
              daysInInventory,
              status: randomStatus
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
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getItems();
      
      // Enhance items with additional calculated fields (similar to useEffect)
      const enhancedItems = data.map((item: Item) => {
        // For each item, this prototype generates a random market price
        const marketPrice = item.purchasePrice * (Math.random() * (1.5 - 0.8) + 0.8);
        const estimatedProfit = marketPrice - item.purchasePrice;
        const roi = (estimatedProfit / item.purchasePrice) * 100;
        const daysInInventory = calculateDaysInInventory(item.purchaseDate);
        
        return {
          ...item,
          marketPrice: parseFloat(marketPrice.toFixed(2)),
          estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
          roi: parseFloat(roi.toFixed(2)),
          daysInInventory,
          status: 'in_stock' // Default status
        };
      });
      
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

  const handleUpdateMarketPrice = (itemId: number, newPrice: number) => {
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

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    return items.filter(item => 
      item.productName.toLowerCase().includes(lowerCaseQuery) ||
      item.category.toLowerCase().includes(lowerCaseQuery) ||
      item.brand.toLowerCase().includes(lowerCaseQuery)
    );
  }, [items, searchQuery]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalItems = filteredItems.length;
    const inStockItems = filteredItems.filter(item => item.status === 'in_stock').length;
    const listedItems = filteredItems.filter(item => item.status === 'listed').length;
    const soldItems = filteredItems.filter(item => item.status === 'sold').length;
    
    const totalPurchaseValue = filteredItems.reduce((sum, item) => sum + item.purchasePrice, 0);
    const totalShippingValue = filteredItems.reduce((sum, item) => sum + (item.shippingPrice || 0), 0);
    const totalMarketValue = filteredItems.reduce((sum, item) => sum + item.marketPrice, 0);
    const totalEstimatedProfit = filteredItems.reduce((sum, item) => sum + item.estimatedProfit, 0);
    
    return {
      totalItems,
      inStockItems,
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
              checked={selectedItems.length > 0 && selectedItems.length === filteredItems.length}
              indeterminate={selectedItems.length > 0 && selectedItems.length < filteredItems.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <Typography variant="body2" component="span">
              {selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select all'}
            </Typography>
          </Grid>
          
          {selectedItems.length > 0 && (
            <>
              <Grid item>
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<AttachMoneyIcon />}
                >
                  Mark as Listed
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  color="success"
                  size="small"
                  startIcon={<AttachMoneyIcon />}
                >
                  Mark as Sold
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="contained" 
                  color="error"
                  size="small"
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
        page={page}
        rowsPerPage={rowsPerPage}
        totalItems={filteredItems.length}
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