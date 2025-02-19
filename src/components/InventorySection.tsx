import React from 'react';
import { 
  Box, 
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Stack,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
  useTheme
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { api, Item } from '../services/api';

interface InventorySectionProps {
  items: Item[];
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQ9ImFuY2hvciIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

const InventorySection: React.FC<InventorySectionProps> = ({ items }) => {
  const theme = useTheme();

  console.log('All items:', items);  // Debug log

  if (items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2
      }}>
        <Typography variant="h6">Your Inventory</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select defaultValue="recent" label="Sort by">
            <MenuItem value="recent">Most Recent</MenuItem>
            <MenuItem value="value">Highest Value</MenuItem>
            <MenuItem value="change">Biggest Change</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Inventory Cards */}
      <Stack spacing={2} sx={{ px: 2 }}>
        {items.map((item) => {
          console.log('Item data:', {
            id: item.id,
            images: item.images,
            imageUrl: item.images?.[0] ? api.getItemImage(item.images[0]) : PLACEHOLDER_IMAGE
          });

          const totalValue = item.purchasePrice; // Replace with actual market value
          const change = ((totalValue - item.purchasePrice) / item.purchasePrice) * 100;
          const isPositive = change >= 0;

          const imageUrl = item.images?.[0] ? api.getItemImage(item.images[0]) : PLACEHOLDER_IMAGE;
          console.log('Image URL for item:', item.id, imageUrl);  // Debug log

          return (
            <Card 
              key={item.id}
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: theme.shadows[1]
              }}
            >
              {/* Image Section */}
              <CardMedia
                component="img"
                height="160"
                image={imageUrl}
                alt={item.productName}
                sx={{ 
                  objectFit: 'cover',
                  bgcolor: 'grey.100'
                }}
              />

              {/* Content Section */}
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight="bold" noWrap>
                    {item.productName}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.brand}
                    </Typography>
                    <Chip 
                      size="small"
                      label={item.sizesQuantity?.[0]?.size || 'N/A'}
                      sx={{ bgcolor: 'grey.100' }}
                    />
                  </Box>

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        Purchase Price
                      </Typography>
                      <Typography variant="subtitle2">
                        ${item.purchasePrice.toFixed(2)}
                      </Typography>
                    </Stack>

                    <Stack alignItems="flex-end">
                      <Typography variant="caption" color="text.secondary">
                        Current Value
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 0.5,
                        color: isPositive ? 'success.main' : 'error.main'
                      }}>
                        {isPositive ? 
                          <TrendingUpIcon fontSize="small" /> : 
                          <TrendingDownIcon fontSize="small" />
                        }
                        <Typography 
                          variant="subtitle2"
                          component="span"
                          sx={{ 
                            color: isPositive ? 'success.main' : 'error.main'
                          }}
                        >
                          ${totalValue.toFixed(2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};

export default InventorySection;
