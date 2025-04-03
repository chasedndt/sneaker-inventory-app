// src/components/EnhancedInventoryDisplay.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Chip,
  Tooltip,
  useTheme,
  Paper,
  Avatar
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ShoeIcon from '@mui/icons-material/DoNotStep'; // Better icon for sneakers
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported'; // For image errors
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // For help/info tooltip
import { Item } from '../services/api';
import { getImageUrl, checkImageExists, handleImageLoadError } from '../utils/imageUtils';
import useFormat from '../hooks/useFormat'; // Import formatting hook

interface EnhancedInventoryDisplayProps {
  items: Item[];
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

const EnhancedInventoryDisplay: React.FC<EnhancedInventoryDisplayProps> = ({ items }) => {
  const theme = useTheme();
  const { money } = useFormat(); // Use the formatting hook
  const [groupedItems, setGroupedItems] = useState<ItemWithImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const apiBaseUrl = 'http://127.0.0.1:5000/api';

  // Effect for grouping and sorting items
  useEffect(() => {
    try {
      console.log('🔄 Processing inventory items for display...');
      setIsLoading(true);
      
      if (items.length === 0) {
        console.log('⚠️ No items to display in inventory');
        setGroupedItems([]);
        setIsLoading(false);
        return;
      }

      // Group and sort items
      const grouped = groupItemsByProduct(items);
      console.log(`✅ Grouped ${items.length} items into ${grouped.length} product groups`);
      
      // Enhance the items with image loading state
      const enhancedItems = grouped.map(item => ({
        ...item,
        imageLoading: true,
        imageError: false
      }));
      
      // Sort items by date (newest first)
      const sorted = [...enhancedItems].sort((a, b) => {
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      });
      
      console.log(`✅ Sorted items by date`);
      setGroupedItems(sorted);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('💥 Error processing inventory items:', error);
      setErrorMessage(`Failed to process inventory: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [items]);

  // Effect for loading images
  useEffect(() => {
    const loadItemImages = async () => {
      console.log('🔄 Loading item images...');
      
      // Make a copy of the current items
      const updatedItems = [...groupedItems];
      let hasChanges = false;
      
      // Process items that are still in loading state
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        
        // Skip if we already processed this item
        if (!item.imageLoading) continue;
        
        try {
          console.log(`🔍 Processing images for item ${item.id}: ${item.productName}`);
          
          // Check if the item has images
          if (item.images && item.images.length > 0) {
            // Get the first image
            const firstImage = item.images[0];
            console.log(`📷 Found image for item ${item.id}: ${firstImage}`);
            
            // Verify the image exists
            const exists = await checkImageExists(firstImage);
            
            if (exists) {
              console.log(`✅ Image verified for item ${item.id}: ${firstImage}`);
              // Update the item with image info
              updatedItems[i] = {
                ...item,
                imageUrl: getImageUrl(firstImage, item.id),
                imageLoading: false,
                imageError: false,
              };
            } else {
              console.warn(`⚠️ Image does not exist for item ${item.id}: ${firstImage}`);
              // Mark as error
              updatedItems[i] = {
                ...item,
                imageLoading: false,
                imageError: true,
                placeholderMessage: `Image not found on server: ${firstImage}`
              };
            }
            
            hasChanges = true;
          } else {
            console.log(`⚠️ No images found for item ${item.id}`);
            // Mark as processed with no images
            updatedItems[i] = {
              ...item,
              imageLoading: false,
              imageError: true,
              placeholderMessage: 'No images available'
            };
            
            hasChanges = true;
          }
        } catch (error) {
          console.error(`💥 Error loading image for item ${item.id}:`, error);
          // Mark as error
          updatedItems[i] = {
            ...item,
            imageLoading: false,
            imageError: true,
            placeholderMessage: 'Error loading image'
          };
          
          hasChanges = true;
        }
      }
      
      // Update state only if we made changes
      if (hasChanges) {
        console.log('✅ Updating item images display state');
        setGroupedItems(updatedItems);
      }
    };
    
    // Only run if there are items with images in loading state
    if (groupedItems.length > 0 && groupedItems.some(item => item.imageLoading)) {
      loadItemImages();
    }
  }, [groupedItems, apiBaseUrl]);

  const handleImageError = (itemId: number) => {
    console.error(`❌ Image load error for item ${itemId}`);
    setGroupedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          imageError: true,
          placeholderMessage: 'Failed to load image' 
        } : item
      )
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading inventory...
        </Typography>
      </Box>
    );
  }

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
          borderRadius: 2
        }}>
          <ShoeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No items in your inventory yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Add your first item using the + button
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '100%',
          pr: 1,
        }}>
          {groupedItems.map((item, index) => {
            // For demonstration, using purchasePrice as current value
            const currentValue = item.purchasePrice;
            const change = calculateChange(item.purchasePrice, currentValue);
            
            // Get colors for this card
            const colors = getGradientColors(item.category);
            
            // Determine what to show in the image area
            let imageContent;
            if (item.imageLoading) {
              // Loading state
              imageContent = (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">Loading...</Typography>
                </Box>
              );
            } else if (item.imageError || !item.imageUrl) {
              // Error state or no image
              imageContent = (
                <Tooltip title={item.placeholderMessage || 'Image not available'}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    <ImageNotSupportedIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.7)', mb: 1 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                      {item.category}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            } else {
              // Image found
              imageContent = (
                <img 
                  src={item.imageUrl}
                  alt={item.productName}
                  onError={() => handleImageError(item.id)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              );
            }
            
            return (
              <Paper 
                key={`${item.id}-${index}`}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  background: `linear-gradient(135deg, ${colors.start}, ${colors.end})`,
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* Left side - Image or Icon */}
                  <Grid item xs={4}>
                    <Box 
                      sx={{
                        width: '100%',
                        height: '100px',
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative'
                      }}
                    >
                      {imageContent}
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
                  
                  {/* Right side - Item details */}
                  <Grid item xs={8}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      pl: 1 // Add padding to the left to move text away from image
                    }}>
                      <Typography 
                        variant="h6" 
                        component="h3" 
                        sx={{ 
                          fontWeight: 600,
                          mb: 0.5,
                          fontSize: '1.1rem',
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          lineHeight: 1.2
                        }}
                      >
                        {item.productName}
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 1
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
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 0.5
                      }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '1.25rem',
                            color: 'white'
                          }}
                        >
                          {/* Use the money formatter here */}
                          {item.count > 1 ? money(item.totalValue) : money(item.purchasePrice)}
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