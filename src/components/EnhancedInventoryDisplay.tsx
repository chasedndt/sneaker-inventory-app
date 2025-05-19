// src/components/EnhancedInventoryDisplay.tsx
import React, { useState, useEffect } from 'react';
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
import { User } from 'firebase/auth';

interface EnhancedInventoryDisplayProps {
  items: Item[];
  currentUser: User | null;
}

// Helper function to calculate percentage change
const calculateChange = (purchasePrice: number, currentValue: number): number => {
  return purchasePrice === 0 ? 0 : ((currentValue - purchasePrice) / purchasePrice) * 100;
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
  placeholderMessage?: string;
}

const EnhancedInventoryDisplay: React.FC<EnhancedInventoryDisplayProps> = ({ 
  items,
  currentUser
}) => {
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  const [groupedItems, setGroupedItems] = useState<ItemWithImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
  const { getAuthToken } = useAuth();

  // Check authentication status
  useEffect(() => {
    if (!currentUser) {
      setAuthError('Authentication required to view inventory');
      setIsLoading(false);
    } else {
      setAuthError(null);
    }
  }, [currentUser]);

  // Effect for grouping and sorting items
  useEffect(() => {
    if (!currentUser) return; // Don't process items if not authenticated
    
    try {
      console.log('🔄 Processing inventory items for display...');
      setIsLoading(true);
      
      if (items.length === 0) {
        console.log('⚠️ No items to display in inventory');
        setGroupedItems([]);
        setIsLoading(false);
        return;
      }

      // COMPREHENSIVE IMAGE PATH DEBUGGING
      console.log('%c📸 DETAILED IMAGE PATH DEBUGGING', 'background: #222; color: #bada55; font-size: 16px; padding: 4px;');
      console.log('API Base URL:', apiBaseUrl);
      
      // Log all items to see their structure
      items.forEach((item, index) => {
        console.log(`%c🔎 ITEM ${index + 1}: ${item.productName}`, 'background: #444; color: #fff; font-size: 14px; padding: 2px;');
        console.log('Full item data:', item); // Log the entire item object
        
        // Image property debugging
        console.log(`ID: ${item.id}`);
        console.log(`Category: ${item.category}`);
        console.log(`imageUrl property: ${item.imageUrl || 'undefined'}`);
        console.log(`images array: ${JSON.stringify(item.images || [])}`);
        
        // Detailed path analysis
        if (item.imageUrl) {
          console.log('%c📝 IMAGE URL ANALYSIS:', 'color: #ff9800; font-weight: bold;');
          console.log(`Raw imageUrl: ${item.imageUrl}`);
          
          // Check if it's a full URL or just a filename
          const isFullUrl = item.imageUrl.includes('http');
          console.log(`Is full URL: ${isFullUrl}`);
          
          if (isFullUrl) {
            // Parse the URL to extract components
            try {
              const url = new URL(item.imageUrl);
              console.log(`Protocol: ${url.protocol}`);
              console.log(`Host: ${url.hostname}`);
              console.log(`Path: ${url.pathname}`);
              console.log(`Filename: ${url.pathname.split('/').pop()}`);
            } catch (e) {
              console.log(`Invalid URL: ${item.imageUrl}`);
            }
          }
          
          // Log possible URL constructions
          console.log(`Possible URL 1: ${apiBaseUrl}/uploads/${item.imageUrl}`);
          console.log(`Possible URL 2: http://localhost:5000/api/uploads/${item.imageUrl}`);
          console.log(`Possible URL 3: http://127.0.0.1:5000/api/uploads/${item.imageUrl}`);
        }
        
        if (item.images && item.images.length > 0) {
          console.log('%c📝 IMAGES ARRAY ANALYSIS:', 'color: #4caf50; font-weight: bold;');
          console.log(`Images array length: ${item.images.length}`);
          
          item.images.forEach((img, imgIndex) => {
            console.log(`Image ${imgIndex + 1}: ${img}`);
            console.log(`Possible URL: ${apiBaseUrl}/uploads/${img}`);
          });
        }
        
        // Log creation and update timestamps
        // Use optional chaining to safely access properties that might not exist in the Item type
        if ((item as any).created_at) {
          console.log(`Created at: ${(item as any).created_at}`);
        }
        if ((item as any).updated_at) {
          console.log(`Updated at: ${(item as any).updated_at}`);
        }
        
        console.log('-----------------------------------');
      });

      // Group and sort items
      const grouped = groupItemsByProduct(items);
      console.log(`✅ Grouped ${items.length} items into ${grouped.length} product groups`);
      
      // Add image loading state to each item and ensure imageUrl is properly set
      const withImageState = grouped.map(item => {
        // Use the getImageUrl utility to construct proper URL with user ID
        
        // If item has images array but no imageUrl, use the first image
        let imageUrl;
        if (item.images && item.images.length > 0) {
          imageUrl = getImageUrl(item.images[0], item.id, currentUser?.uid);
        } else if (item.imageUrl) {
          imageUrl = getImageUrl(item.imageUrl, item.id, currentUser?.uid);
        }
        
        // Add debugging for image URLs
        console.log(`Dashboard item ${item.id} image:`, {
          imageUrl: item.imageUrl,
          firstImage: item.images && item.images.length > 0 ? item.images[0] : null,
          userId: currentUser?.uid,
          constructedUrl: imageUrl
        });
        
        return {
          ...item,
          imageUrl,
          imageLoading: true,
          imageError: false
        };
      });
      
      console.log('Processed items with images:', withImageState);
      setGroupedItems(withImageState);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('💥 Error processing inventory items:', error);
      setErrorMessage(`Failed to process inventory: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [items, currentUser]);

  // Show authentication error if not logged in
  if (authError) {
    return (
      <Box sx={{ p: 3, borderRadius: 2 }}>
        <Alert severity="warning">
          {authError}
        </Alert>
      </Box>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 3 
      }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading inventory...
        </Typography>
      </Box>
    );
  }

  // Show error message if any
  if (errorMessage) {
    return (
      <Box sx={{ 
        p: 2, 
        bgcolor: '#fff1f0', 
        borderRadius: 2,
        border: '1px solid #ffccc7'
      }}>
        <Typography variant="body2" color="#cf1322">
          {errorMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>

      {groupedItems.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 4, 
          bgcolor: '#f9f9f9', 
          borderRadius: 2,
          mt: 2
        }}>
          <ShoeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No items in your inventory yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Add your first item using the + button
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            size="small"
            sx={{ mt: 2 }}
          >
            Add Item
          </Button>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          width: '100%',
          pb: 2
        }}>
          {groupedItems.map((item, index) => {
            // For demonstration, using purchasePrice as current value
            const currentValue = item.purchasePrice;
            const change = calculateChange(item.purchasePrice, currentValue);
            
            // Get colors for this card
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
                  height: '180px',
                  width: '100%'
                }}
                elevation={1}
              >
                <Grid container spacing={0}>
                  {/* Image area - left side */}
                  <Grid item xs={4}>
                    <Box sx={{ 
                      height: '180px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRight: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {/* Use the correct image path that includes the user ID */}
                      <Box 
                        component="img"
                        src={item.imageUrl || getCategoryPlaceholderImage(item.category)}
                        alt={item.productName}
                        onError={(e) => {
                          console.log(`Image failed to load for ${item.productName}`);
                          (e.currentTarget as HTMLImageElement).src = getCategoryPlaceholderImage(item.category);
                        }}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
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
                          {money(item.purchasePrice)}
                        </Typography>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          backgroundColor: change >= 0 ? 'rgba(67, 217, 173, 0.2)' : 'rgba(255, 99, 99, 0.2)',
                          borderRadius: '12px',
                          padding: '4px 8px'
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