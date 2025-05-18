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
import { getCategoryPlaceholderImage } from '../utils/imageUtils';
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

      // Group and sort items
      const grouped = groupItemsByProduct(items);
      console.log(`✅ Grouped ${items.length} items into ${grouped.length} product groups`);
      
      // Add image loading state to each item
      const withImageState = grouped.map(item => ({
        ...item,
        imageLoading: true,
        imageError: false
      }));
      
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
      {/* Header section to match the portfolio graph structure */}
      <Box sx={{ 
        height: '64px', 
        p: 2,
        display: 'flex',
        alignItems: 'flex-end',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 1
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
          Inventory Items
        </Typography>
      </Box>

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
          gap: 2,
          width: '100%',
          p: 2,
          pt: 1
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
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                elevation={1}
              >
                <Grid container>
                  {/* Image area - left side */}
                  <Grid item xs={4}>
                    <Box sx={{ 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1,
                      bgcolor: 'rgba(0,0,0,0.2)'
                    }}>
                      <Box 
                        component="img"
                        src={getCategoryPlaceholderImage(item.category)}
                        alt={item.productName}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Content area - right side */}
                  <Grid item xs={8}>
                    <Box sx={{ p: 1.5 }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 700,
                          color: 'white',
                          mb: 0.5,
                          fontSize: '1rem',
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