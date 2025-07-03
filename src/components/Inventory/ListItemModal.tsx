// src/components/Inventory/ListItemModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
  useTheme,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import dayjs, { Dayjs } from 'dayjs';

import { InventoryItem } from '../../pages/InventoryPage';
import { api } from '../../services/api';
import useFormat from '../../hooks/useFormat';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useNavigate } from 'react-router-dom';

interface Listing {
  id?: string;
  platform: string;
  price: number;
  url?: string;
  date: Dayjs;
  status: 'active' | 'sold' | 'expired';
}

interface ListItemModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  items: InventoryItem[];
}

// Default list of marketplace platforms
const DEFAULT_PLATFORMS = [
  'StockX',
  'eBay',
  'GOAT',
  'Grailed',
  'Depop',
  'Poshmark',
  'Mercari',
  'Vestiaire Collective',
  'Facebook Marketplace',
  'Etsy',
  'Other'
];

const ListItemModal: React.FC<ListItemModalProps> = ({
  open,
  onClose,
  items
}) => {
  const theme = useTheme();
  const { money } = useFormat();
  const { getCurrentCurrency } = useSettings();
  const { currentUser, getAuthToken, authReady } = useAuthReady();
  const navigate = useNavigate();
  
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [newListing, setNewListing] = useState<Listing>({
    platform: '',
    price: 0,
    url: '',
    date: dayjs(),
    status: 'active'
  });
  const [isAddingListing, setIsAddingListing] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<string[]>(DEFAULT_PLATFORMS);
  const [customPlatform, setCustomPlatform] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [changesDetected, setChangesDetected] = useState<boolean>(false);
  const [authCheckingInProgress, setAuthCheckingInProgress] = useState(false);
  const currencySymbol = getCurrentCurrency();

  // Authentication check function
  const checkAuthentication = async () => {
    setAuthCheckingInProgress(true);
    try {
      if (!authReady) {
        setError('Authentication process is not yet complete. Please wait a moment and try again.');
        // Optional: Add a brief delay or a specific user action if this state is hit unexpectedly.
        return false;
      }
      if (!currentUser) {
        setError('Authentication required. Please log in to manage listings.');
        setTimeout(() => {
          onClose(false);
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Please log in to manage your listings.' 
            } 
          });
        }, 2000);
        return false;
      }
      
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication token is invalid or expired. Please log in again.');
        setTimeout(() => {
          onClose(false);
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Your session has expired. Please log in again.' 
            } 
          });
        }, 2000);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      setError('Authentication error. Please log in again.');
      return false;
    } finally {
      setAuthCheckingInProgress(false);
    }
  };

  // Check authentication and item ownership when modal opens
  useEffect(() => {
    if (open && items.length > 0) {
      const verifyAuthAndLoadData = async () => {
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) return;
        
        // Verify item ownership
        try {
          // Select the first item and try to fetch it to verify ownership
          const currentItem = items[0];
          const fetchedItem = await api.getItem(currentItem.id);
          
          if (!fetchedItem) {
            setError('Item not found or you do not have permission to manage its listings.');
            return;
          }
          
          // Initialize the component with the item's listings
          setSelectedItemIndex(0);
          
          if (currentItem.listings && Array.isArray(currentItem.listings)) {
            setListings(currentItem.listings.map(listing => ({
              ...listing,
              date: dayjs(listing.date)
            })));
          } else {
            setListings([]);
          }
          
          setNewListing({
            platform: platforms[0] || '',
            price: 0,
            url: '',
            date: dayjs(),
            status: 'active'
          });
          setIsAddingListing(false);
          setError(null);
          setSuccess(null);
          setChangesDetected(false);
          
          // Load stored platforms
          loadPlatforms();
        } catch (error: any) {
          // Handle unauthorized access or other errors
          if (error.message && (
              error.message.includes('Unauthorized access') ||
              error.message.includes('permission')
          )) {
            setError('You do not have permission to manage listings for this item.');
          } else {
            setError(`Error: ${error.message}`);
          }
        }
      };
      
      verifyAuthAndLoadData();
    }
  }, [open, items]);

  // Update listings when selected item changes
  useEffect(() => {
    if (open && items.length > 0 && selectedItemIndex < items.length) {
      const currentItem = items[selectedItemIndex];
      
      if (currentItem.listings && Array.isArray(currentItem.listings)) {
        setListings(currentItem.listings.map(listing => ({
          ...listing,
          date: dayjs(listing.date)
        })));
      } else {
        setListings([]);
      }
      
      setChangesDetected(false);
    }
  }, [selectedItemIndex, items, open]);

  // Load saved platforms
  const loadPlatforms = async () => {
    try {
      // In a real implementation, you would fetch this from your API
      // For now, we'll use localStorage as a simple persistence mechanism
      const savedPlatforms = localStorage.getItem('listing_platforms');
      if (savedPlatforms) {
        setPlatforms(JSON.parse(savedPlatforms));
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
      // Fall back to default platforms
      setPlatforms(DEFAULT_PLATFORMS);
    }
  };

  // Save platforms
  const savePlatforms = (platforms: string[]) => {
    try {
      localStorage.setItem('listing_platforms', JSON.stringify(platforms));
    } catch (error) {
      console.error('Failed to save platforms:', error);
    }
  };

  // Handle item selection change
  const handleItemChange = (event: SelectChangeEvent<number>) => {
    const index = event.target.value as number;
    setSelectedItemIndex(index);
  };

  // Add a new listing
  const handleAddListing = async () => {
    // Verify authentication before adding a listing
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    setIsAddingListing(true);
    setNewListing({
      platform: platforms[0] || '',
      price: 0,
      url: '',
      date: dayjs(),
      status: 'active'
    });
    setError(null);
  };

  // Handle price input change with proper formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove any non-numeric characters except decimal point
    let cleanValue = inputValue.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const decimalCount = (cleanValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const parts = cleanValue.split('.');
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Convert to number or use 0 if empty/invalid
    const numValue = cleanValue ? parseFloat(cleanValue) : 0;
    
    setNewListing({ ...newListing, price: numValue });
  };

  // Save the new listing
  const handleSaveListing = () => {
    // Validate the listing
    if (!newListing.platform) {
      setError('Platform is required');
      return;
    }
    
    if (newListing.price <= 0) {
      setError('Price must be greater than zero');
      return;
    }
    
    // Add the new listing to the array
    const updatedListings = [...listings, { ...newListing, id: `temp-${Date.now()}` }];
    setListings(updatedListings);
    
    // Add the platform to the list if it's custom
    if (!platforms.includes(newListing.platform)) {
      const updatedPlatforms = [...platforms, newListing.platform];
      setPlatforms(updatedPlatforms);
      savePlatforms(updatedPlatforms);
    }
    
    // Reset the form
    setIsAddingListing(false);
    setNewListing({
      platform: '',
      price: 0,
      url: '',
      date: dayjs(),
      status: 'active'
    });
    setError(null);
    setChangesDetected(true);
  };

  // Cancel adding a new listing
  const handleCancelAddListing = () => {
    setIsAddingListing(false);
    setError(null);
  };

  // Delete a listing
  const handleDeleteListing = async (index: number) => {
    // Verify authentication before deleting a listing
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    const updatedListings = [...listings];
    updatedListings.splice(index, 1);
    setListings(updatedListings);
    setChangesDetected(true);
  };

  // Handle custom platform input
  const handleAddCustomPlatform = () => {
    if (!customPlatform.trim()) return;
    
    if (platforms.includes(customPlatform)) {
      setError('Platform already exists');
      return;
    }
    
    const updatedPlatforms = [...platforms, customPlatform];
    setPlatforms(updatedPlatforms);
    savePlatforms(updatedPlatforms);
    setNewListing({ ...newListing, platform: customPlatform });
    setCustomPlatform('');
  };

  // Save changes to the database
  const handleSaveChanges = async () => {
    if (!changesDetected) {
      onClose(false);
      return;
    }
    
    // Verify authentication before saving changes
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const currentItem = items[selectedItemIndex];
      
      // Format the listings properly for storage
      const formattedListings = listings.map(listing => ({
        ...listing,
        // Ensure date is stored as ISO string
        date: typeof listing.date === 'object' ? listing.date.toISOString() : listing.date
      }));
      
      try {
        // Update the item with new listings
        await api.updateItemField(currentItem.id, 'listings', formattedListings);
        
        // If item is not already marked as listed, update its status
        if (currentItem.status !== 'listed' && listings.length > 0) {
          await api.updateItemField(currentItem.id, 'status', 'listed');
        }
        
        setSuccess('Listings updated successfully');
        setChangesDetected(false);
        
        // Close the modal after a brief delay to show the success message
        setTimeout(() => {
          onClose(true);
        }, 1500);
      } catch (apiError: any) {
        // Handle authentication errors specifically
        if (apiError.message && (
            apiError.message.includes('Authentication required') ||
            apiError.message.includes('Authentication expired') ||
            apiError.message.includes('Authentication token is invalid') ||
            apiError.message.includes('Unauthorized access')
        )) {
          setError(`Authentication error: ${apiError.message}`);
          setTimeout(() => {
            onClose(false);
            navigate('/login', { 
              state: { 
                from: '/inventory',
                message: 'Your session has expired. Please log in again.' 
              } 
            });
          }, 2000);
        } else {
          setError(`Failed to save listings: ${apiError.message}`);
        }
      }
    } catch (err: any) {
      setError(`Failed to save listings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Current selected item
  const currentItem = items[selectedItemIndex];

  return (
    <Dialog 
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.background.paper
        }
      }}
    >
      <DialogTitle>
        Manage Listings
        <IconButton
          aria-label="close"
          onClick={() => onClose(false)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {/* Authentication check in progress */}
        {authCheckingInProgress && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 2
          }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Verifying authentication...</Typography>
          </Box>
        )}
        
        {/* Item Selector (only shown if multiple items selected) */}
        {items.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Selected Item</InputLabel>
              <Select
                value={selectedItemIndex}
                label="Selected Item"
                onChange={handleItemChange}
              >
                {items.map((item, index) => (
                  <MenuItem key={item.id} value={index}>
                    {item.productName} - {item.brand}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              You can configure listings for each item separately.
            </Typography>
          </Box>
        )}
        
        {/* Current Item Details */}
        {currentItem && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Item Name</Typography>
                <Typography variant="body1">{currentItem?.productName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Brand</Typography>
                <Typography variant="body1">{currentItem?.brand}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                <Typography variant="body1">{currentItem?.category}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Current Status</Typography>
                <Chip
                  label={currentItem?.status.charAt(0).toUpperCase() + currentItem?.status.slice(1)}
                  color={currentItem?.status === 'listed' ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* Current Listings */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Current Listings
          </Typography>
          
          <Paper
            variant="outlined"
            sx={{
              maxHeight: 250,
              overflow: 'auto',
              borderRadius: 1,
              mb: 2
            }}
          >
            {listings.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No listings yet
                </Typography>
              </Box>
            ) : (
              <List dense>
                {listings.map((listing, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleDeleteListing(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{
                      borderLeft: `4px solid ${
                        listing.status === 'active' ? theme.palette.success.main :
                        listing.status === 'sold' ? theme.palette.warning.main :
                        theme.palette.error.main
                      }`,
                      mb: 0.5,
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemText
                      disableTypography
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StorefrontIcon fontSize="small" />
                          <Typography variant="body2">
                            {listing.platform}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Price: {money(listing.price)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Listed: {typeof listing.date === 'object' 
                              ? listing.date.format('MM/DD/YYYY') 
                              : dayjs(listing.date).format('MM/DD/YYYY')}
                          </Typography>
                          {listing.url && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LinkIcon fontSize="small" />
                              <Typography variant="caption" component="a" href={listing.url} target="_blank" rel="noopener noreferrer">
                                View Listing
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddListing}
            disabled={isAddingListing || authCheckingInProgress}
            fullWidth
          >
            Add New Listing
          </Button>
        </Box>
        
        {/* Add New Listing Form */}
        {isAddingListing && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Add New Listing
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Platform</InputLabel>
                  <Select
                    value={newListing.platform}
                    label="Platform"
                    onChange={(e) => setNewListing({ ...newListing, platform: e.target.value })}
                  >
                    {platforms.map((platform) => (
                      <MenuItem key={platform} value={platform}>
                        {platform}
                      </MenuItem>
                    ))}
                    <MenuItem value="__custom__">
                      <em>Add Custom Platform</em>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                {newListing.platform === '__custom__' && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      label="Custom Platform"
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddCustomPlatform}
                      disabled={!customPlatform.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price"
                  type="number"
                  value={newListing.price === 0 ? '' : newListing.price} // Prevent displaying "0"
                  onChange={handlePriceChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                  }}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Listing Date"
                    value={newListing.date}
                    onChange={(date) => setNewListing({ ...newListing, date: date || dayjs() })}
                    slotProps={{ textField: { fullWidth: true } }}
                    sx={{ mb: 2 }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newListing.status}
                    label="Status"
                    onChange={(e) => setNewListing({ ...newListing, status: e.target.value as 'active' | 'sold' | 'expired' })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="sold">Sold</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
              <TextField
                  label="Listing URL (Optional)"
                  value={newListing.url || ''}
                  onChange={(e) => setNewListing({ ...newListing, url: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  placeholder="https://example.com/your-listing"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={handleCancelAddListing}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveListing}
                disabled={!newListing.platform || newListing.price <= 0}
              >
                Add Listing
              </Button>
            </Box>
          </Paper>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveChanges}
          disabled={!changesDetected || loading || authCheckingInProgress}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ListItemModal;