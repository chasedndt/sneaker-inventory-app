// src/components/EnhancedInventoryDisplay.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Chip,
  Paper,
  Alert,
  CircularProgress,
  Button,
  useTheme,
  Tooltip
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ShoeIcon from '@mui/icons-material/DoNotStep'; // Better icon for sneakers
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported'; // For image errors
import AddIcon from '@mui/icons-material/Add'; // For add button
import { Item } from '../services/api';
import { getCategoryPlaceholderImage, safeImageUrl, getImageUrl } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';
import useFormat from '../hooks/useFormat'; // Import formatting hook
import { useSettings } from '../contexts/SettingsContext'; // Import settings context
import { currencyConverter } from '../utils/currencyUtils'; // Import currency converter
import { User } from 'firebase/auth';
import { InventoryItem } from '../pages/InventoryPage'; // Import InventoryItem type

interface EnhancedInventoryDisplayProps {
  items: Item[];
  currentUser: User | null;
}

// Helper function to calculate percentage change
// Helper function to calculate percentage change, with safety checks
const calculateChange = (purchasePrice: number, currentValue: number): number => {
  // Prevent division by zero
  if (purchasePrice === 0) return 0;
  
  return ((currentValue - purchasePrice) / purchasePrice) * 100;
};

// Helper function to group items by product name and calculate totals
const groupItemsByProduct = (items: Item[]) => {
  const groupedItems = items.reduce((acc, item) => {
    const key = item.productName;
    if (!acc[key]) {
      acc[key] = {
        ...item,
        count: 1,
        totalValue: item.purchasePrice
      };
    } else {
      acc[key].count += 1;
      acc[key].totalValue += item.purchasePrice;
    }
    return acc;
  }, {} as Record<string, Item & { count: number, totalValue: number }>);

  return Object.values(groupedItems);
};

// Function to get gradient color based on category
const getGradientColors = (category: string): { start: string, end: string } => {
  const categoryColors: Record<string, { start: string, end: string }> = {
    'Sneakers': { start: '#6a3de8', end: '#5035b8' }, // Purple
    'Streetwear': { start: '#3d7ee8', end: '#3554b8' }, // Blue
    'Handbags': { start: '#e83d6a', end: '#b83550' }, // Red
    'Watches': { start: '#e8a53d', end: '#b87e35' }, // Orange
    'Accessories': { start: '#3de8a5', end: '#35b871' }, // Green
    'Electronics': { start: '#3d3de8', end: '#3535b8' }, // Deep Blue
    'Collectibles': { start: '#e83dc4', end: '#b835a0' }, // Magenta/Pink
    'Other': { start: '#6e6e6e', end: '#4c4c4c' }, // Gray
  };
  
  return categoryColors[category] || categoryColors['Other'];
};

interface ItemWithImage extends Item {
  count: number;
  totalValue: number;
  imageUrl?: string; 
  imageLoading: boolean;
  imageError: boolean;
  placeholderMessage: string | null;
  marketPriceCurrency?: string;
}

const EnhancedInventoryDisplay: React.FC<EnhancedInventoryDisplayProps> = ({ 
  items,
  currentUser
}) => {
  const { accountTier: currentAccountTier } = useAuth(); // Get actual account tier from auth context
  const enableDebugLogging = process.env.NODE_ENV !== 'production'; // Control debug logging
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  const { currency } = useSettings(); // Get currency settings at component level
  const [groupedItems, setGroupedItems] = useState<ItemWithImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set()); // Track failed images
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
  const { getAuthToken } = useAuth(); // accountTier is already available as currentAccountTier
  
  // Debugging logger function
  const log = (message: string, ...args: any[]) => {
    if (enableDebugLogging) {
      console.log(message, ...args);
    }
  };

  // Function to handle image errors with cooldown
  const handleImageError = useCallback((productName: string, imageUrl: string) => {
    const imageKey = `${productName}-${imageUrl}`;
    
    // Only log if we haven't already logged this failure
    if (!failedImages.has(imageKey)) {
      setFailedImages(prev => new Set(prev).add(imageKey));
      // ALWAYS log image failures for debugging
      console.error(`❌ Image failed to load for ${productName}:`);
      console.error(`   URL: ${imageUrl}`);
      console.error(`   Current failed images count: ${failedImages.size + 1}`);
    } else {
      console.log(`🔁 Suppressed repeated error for ${productName}`);
    }
  }, [failedImages]);

  // Check authentication status
  useEffect(() => {
    if (!currentUser) {
      setAuthError('Authentication required to view inventory');
      setIsLoading(false);
    } else {
      setAuthError(null);
    }
  }, [currentUser]);

  // Test backend connectivity
  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/ping`);
        if (response.ok) {
          console.log('✅ Backend is reachable');
        } else {
          console.error('❌ Backend responded with error:', response.status);
        }
      } catch (error) {
        console.error('❌ Backend is not reachable:', error);
      }
    };
    testBackend();
  }, [apiBaseUrl]);

  // Effect for grouping and sorting items
  useEffect(() => {
    if (!currentUser) return; // Don't process items if not authenticated
    
    try {
      log('🔄 Processing inventory items for display...');
      setIsLoading(true);
      
      if (items.length === 0) {
        log('⚠️ No items to display in inventory');
        setGroupedItems([]);
        setIsLoading(false);
        return;
      }
      
      // CRITICAL FIX: Properly process the market prices with the correct currency conversion
      // This ensures the card displays match the inventory page
      const itemsWithCorrectCurrency = items.map(item => {
        // Get the original market price and currency
        const marketPrice = item.marketPrice;
        const purchasePrice = item.purchasePrice;
        
        // Log the original values only when debugging is enabled
        if (enableDebugLogging) {
          log(`🔎 [EnhancedDisplay] Processing ${item.productName}: Market Price = ${marketPrice} ${(item as any).marketPriceCurrency || 'unknown currency'}`);
        }
        
        return {
          ...item,
          // Use the marketPrice directly as it should already be converted by the enhanced API
          marketPrice: marketPrice,
          purchasePrice: purchasePrice
        };
      });
      
      // Get all items, group them, then take only the first 4 (most recent)
      const grouped = groupItemsByProduct(itemsWithCorrectCurrency);
      
      // Sort by purchase date (newest first)
      grouped.sort((a, b) => {
        const dateA = new Date(a.purchaseDate).getTime();
        const dateB = new Date(b.purchaseDate).getTime();
        return dateB - dateA;
      });
      
      // Limit to 4 items for the dashboard display
      const limitedItems = grouped.slice(0, 4);
      
      // Debug each item's market price only when debugging is enabled
      if (enableDebugLogging) {
        limitedItems.forEach(item => {
          log(`✅ [Dashboard Card] ${item.productName}: ${currency} ${item.marketPrice}`);
        });
      }
      
      if (enableDebugLogging) {
        log(`✅ Grouped ${items.length} items into ${limitedItems.length} product groups (showing ${limitedItems.length} on dashboard)`);
      }
      
      // Add image loading and error state for each item
      const itemsWithImageState = limitedItems.map((item) => {
        // Default to first image in the array or use the main imageUrl property
        const firstImage = item.images && item.images.length > 0 ? item.images[0] : null;
        const imageSource = item.imageUrl || firstImage;
        
        let imageUrl;
        let placeholderMessage = null;
        
        // Attempt to get the image URL if we have an image source
        if (imageSource) {
          // Use getImageUrl utility to properly construct the URL with user ID
          imageUrl = getImageUrl(imageSource, item.id, currentUser?.uid);
          if (enableDebugLogging) {
            console.log(`🔍 DEBUG: Item ${item.productName} - Generated imageUrl: ${imageUrl}`);
          }
        } else {
          // No image available, don't set imageUrl so we show the placeholder content
          imageUrl = undefined;
          placeholderMessage = `No image for ${item.category}`;
          if (enableDebugLogging) {
            console.log(`🔍 DEBUG: No image source for ${item.productName}, will show placeholder content`);
          }
        }
        
        return {
          ...item,
          imageUrl,
          imageLoading: false,
          imageError: false,
          placeholderMessage,
        };
      });
      
      setGroupedItems(itemsWithImageState);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage('Error processing inventory items');
      setIsLoading(false);
    }
  }, [items, currentUser, getAuthToken, apiBaseUrl, currency]);

  const showFreeTierLimitWarning = currentAccountTier === 'free' && items.length >= 30;

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {showFreeTierLimitWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You've reached the 30 item limit for the Free plan. Some features may be restricted. Consider upgrading for more capacity.
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
      )}
      
      {authError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {authError}
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ ml: 2 }}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 2,
          width: '100%'
        }}>
          {groupedItems.map((item, index) => {
            // Get effective market price - either the actual market price if valid, or purchase price + 20% otherwise
            // This ensures all items have a consistent display, matching the inventory page
            const effectiveMarketPrice = (typeof item.marketPrice === 'number' && item.marketPrice > 0) 
              ? item.marketPrice 
              : item.purchasePrice * 1.2; // Use 20% markup when market price is missing/invalid
              
            // Calculate unrealized profit amount
            const unrealizedProfit = effectiveMarketPrice - item.purchasePrice;
            
            // Calculate percentage change for profit visualization
            const change = calculateChange(item.purchasePrice, effectiveMarketPrice);
            
            const colors = getGradientColors(item.category);
            
            return (
              <Paper 
                key={`${item.id}-${index}`}
                sx={{
                  overflow: 'hidden',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                  },
                  height: '160px', // Reduced from 180px to 160px
                  width: '100%'
                }}
                elevation={1}
              >
                <Grid container spacing={0}>
                  {/* Image area - left side */}
                  <Grid item xs={4}>
                    <Box sx={{ 
                      height: '160px', // Reduced to match card height
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRight: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {/* Display image or placeholder content */}
                      {item.imageUrl && !item.imageUrl.includes('placeholder') ? (
                      <Box 
                        component="img"
                          src={item.imageUrl}
                        alt={item.productName}
                        onError={(e) => {
                            const imgElement = e.currentTarget as HTMLImageElement;
                            // Hide the broken image and show placeholder content instead
                            imgElement.style.display = 'none';
                            const placeholderDiv = imgElement.parentElement?.querySelector('.placeholder-content');
                            if (placeholderDiv) {
                              (placeholderDiv as HTMLElement).style.display = 'flex';
                            }
                          handleImageError(item.productName, item.imageUrl || 'unknown');
                        }}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                      ) : null}
                      
                      {/* Placeholder content for items without images */}
                      <Box 
                        className="placeholder-content"
                        sx={{
                          display: (!item.imageUrl || item.imageUrl.includes('placeholder')) ? 'flex' : 'none',
                          width: '100%',
                          height: '100%',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.7)',
                          textAlign: 'center'
                        }}
                      >
                        <Box
                          sx={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1
                          }}
                        >
                          📷
                        </Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontWeight: 500
                          }}
                        >
                          No Image
                        </Typography>
                      </Box>
                      <Chip 
                        label={item.category} 
                        size="small"
                        sx={{ 
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          height: '20px',
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.65rem'
                        }}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Content area - right side */}
                  <Grid item xs={8}>
                    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 700,
                            color: 'white',
                            mb: 0.5,
                            fontSize: '1.1rem',
                            lineHeight: 1.2
                          }}
                        >
                          {item.productName}
                        </Typography>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center' 
                        }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.85)',
                          }}
                        >
                          {item.brand}
                        </Typography>
                        
                        {item.count > 1 && (
                          <Chip 
                            label={`${item.count}×`} 
                            size="small"
                            sx={{ 
                              height: '20px',
                              backgroundColor: 'rgba(255,255,255,0.25)',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                        )}
                      </Box>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 'auto'
                      }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '1.25rem',
                            color: 'white'
                          }}
                        >
                          {money(effectiveMarketPrice, currency)}
                        </Typography>
                        
                        <Tooltip
                          title={
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                {/* Use consistent format for all items, using our calculated unrealizedProfit */}
                                Unrealized Profit: {money(unrealizedProfit, currency)}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            backgroundColor: change >= 0 ? 'rgba(67, 217, 173, 0.2)' : 'rgba(255, 99, 99, 0.2)',
                            borderRadius: '12px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease-in-out, box-shadow 0.1s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }
                          }}>
                            {change >= 0 ? (
                              <ArrowUpwardIcon 
                                fontSize="small" 
                                sx={{ 
                                  fontSize: '0.875rem',
                                  color: 'rgb(67, 217, 173)'
                                }}
                              />
                            ) : (
                              <ArrowDownwardIcon 
                                fontSize="small" 
                                sx={{ 
                                  fontSize: '0.875rem',
                                  color: 'rgb(255, 99, 99)'
                                }}
                              />
                            )}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: change >= 0 ? 'rgb(67, 217, 173)' : 'rgb(255, 99, 99)',
                                ml: 0.5
                              }}
                            >
                              {Math.abs(change).toFixed(1)}%
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.75rem',
                          color: 'rgba(255,255,255,0.7)',
                          mt: 0.5
                        }}
                      >
                        Added: {new Date(item.purchaseDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default EnhancedInventoryDisplay;