// src/components/EnhancedInventoryDisplay.tsx - with TypeScript fixes
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ShoeIcon from '@mui/icons-material/DoNotStep'; // Better icon for sneakers
import { Item } from '../services/api';

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

const EnhancedInventoryDisplay: React.FC<EnhancedInventoryDisplayProps> = ({ items }) => {
  const [sortBy, setSortBy] = useState<string>('purchaseDate');
  const [groupedItems, setGroupedItems] = useState<(Item & { count: number, totalValue: number })[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Group and sort items
    const grouped = groupItemsByProduct(items);
    
    // Sort items based on the selected sort criteria
    const sorted = [...grouped].sort((a, b) => {
      if (sortBy === 'purchaseDate') {
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      } else if (sortBy === 'price') {
        return b.totalValue - a.totalValue;
      } else if (sortBy === 'quantity') {
        return b.count - a.count;
      }
      return 0;
    });
    
    setGroupedItems(sorted);
    
    // Log all items and their image data for debugging
    console.log('Grouped items with image data:', 
      sorted.map(item => ({
        id: item.id,
        name: item.productName,
        brand: item.brand,
        hasImages: Boolean(item.images && item.images.length),
        images: item.images
      }))
    );
  }, [items, sortBy]);

  const handleImageError = (itemId: number, imageFileName: string | undefined) => {
    // Make sure filename is defined before proceeding
    if (!imageFileName) {
      console.error('Attempted to handle error for undefined image filename');
      setImageErrors(prev => ({
        ...prev,
        [itemId]: true
      }));
      return;
    }
    
    // Log detailed information about the failed image
    console.error('Image Load Error:', {
      itemId,
      imageFileName,
      attemptedUrl: `http://127.0.0.1:5000/api/uploads/${imageFileName}`,
      timestamp: new Date().toISOString(),
      navigator: {
        userAgent: navigator.userAgent,
        onLine: navigator.onLine
      }
    });
    
    // Check if the image file exists on the server using a fetch request
    fetch(`http://127.0.0.1:5000/api/check-image/${imageFileName}`)
      .then(response => response.json())
      .then(data => {
        console.log('Image existence check:', data);
      })
      .catch(error => {
        console.error('Image check API error:', error);
      });
    
    // Update state to prevent further attempts
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      mt: 3
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        mb: 2
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            fontSize: '1.25rem',
            color: '#1a1a1a'
          }}
        >
          Your Inventory
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={handleSortChange}
          >
            <MenuItem value="purchaseDate">Date</MenuItem>
            <MenuItem value="price">Price</MenuItem>
            <MenuItem value="quantity">Quantity</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxHeight: '70vh',
        overflowY: 'auto',
        pr: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      }}>
        {groupedItems.map((item, index) => {
          // For demonstration, using purchasePrice as current value
          const currentValue = item.purchasePrice;
          const change = calculateChange(item.purchasePrice, currentValue);
          
          // Get colors for this card
          const colors = getGradientColors(item.category);

          // Check if we have an image and if it hasn't failed to load before
          const hasImage = item.images && item.images.length > 0 && !imageErrors[item.id];
          
          // Get the first image filename safely
          const firstImage = hasImage && item.images && item.images.length > 0 ? item.images[0] : undefined;
          
          // Debug logging for this specific item's image data
          if (hasImage && firstImage) {
            console.log(`Rendering item ${item.id} with image:`, firstImage);
          } else {
            console.log(`Item ${item.id} has no valid images:`, item.images || 'undefined');
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
                      height: '120px',
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
                    {hasImage && firstImage ? (
                      <img 
                        src={`http://127.0.0.1:5000/api/uploads/${firstImage}`}
                        alt={item.productName}
                        onError={() => handleImageError(item.id, firstImage)}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <>
                        <ShoeIcon sx={{ fontSize: 48, color: 'white' }} />
                        <Typography 
                          variant="caption"
                          sx={{ 
                            color: 'white', 
                            mt: 1,
                            textAlign: 'center',
                            fontWeight: 'medium'
                          }}
                        >
                          {item.category}
                        </Typography>
                      </>
                    )}
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
                        ${item.count > 1 ? item.totalValue.toFixed(2) : item.purchasePrice.toFixed(2)}
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
    </Box>
  );
};

export default EnhancedInventoryDisplay;