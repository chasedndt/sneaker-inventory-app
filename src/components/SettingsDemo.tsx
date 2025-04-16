// src/components/SettingsDemo.tsx
import React from 'react';
import { 
  Paper, 
  Typography, 
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme 
} from '@mui/material';
import { useSettings } from '../contexts/SettingsContext';
import useFormat from '../hooks/useFormat';

/**
 * A demonstration component showing how the settings affect the application
 */
const SettingsDemo: React.FC = () => {
  const theme = useTheme();
  const { darkMode, currency, dateFormat } = useSettings();
  const { date, money, convertAndFormat } = useFormat();
  
  // Sample data for demonstration
  const today = new Date();
  const sampleAmount = 199.99;
  const sampleAmountEUR = 185.50;
  const sampleAmountGBP = 156.75;

  return (
    <Paper sx={{ 
      p: 3, 
      borderRadius: 2,
      bgcolor: theme.palette.background.paper,
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Settings Preview
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Settings</Typography>
      <List dense sx={{ mb: 2 }}>
        <ListItem>
          <ListItemText 
            primary="Theme Mode" 
            secondary={darkMode ? 'Dark Mode' : 'Light Mode'} 
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ 
              sx: { 
                color: darkMode ? theme.palette.primary.main : '#f9a825',
                fontWeight: 'medium'
              } 
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Currency" 
            secondary={currency} 
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ 
              sx: { 
                color: theme.palette.primary.main,
                fontWeight: 'medium'
              } 
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Date Format" 
            secondary={dateFormat} 
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ 
              sx: { 
                color: theme.palette.primary.main,
                fontWeight: 'medium'
              } 
            }}
          />
        </ListItem>
      </List>
      
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Today's Date</Typography>
      <Box sx={{ p: 2, bgcolor: theme.palette.action.hover, borderRadius: 1, mb: 2 }}>
        <Typography variant="body1" fontFamily="monospace">
          {date(today)}
        </Typography>
      </Box>
      
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Currency Formatting</Typography>
      <List dense>
        <ListItem>
          <ListItemText 
            primary="US Dollar Amount" 
            secondary={money(sampleAmount)} 
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ 
              sx: { 
                color: theme.palette.success.main,
                fontWeight: 'medium'
              } 
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Euro Amount (€185.50)" 
            secondary={convertAndFormat(sampleAmountEUR, 'EUR')} 
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ 
              sx: { 
                color: theme.palette.success.main,
                fontWeight: 'medium'
              } 
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="British Pound Amount (£156.75)" 
            secondary={convertAndFormat(sampleAmountGBP, 'GBP')} 
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ 
              sx: { 
                color: theme.palette.success.main,
                fontWeight: 'medium'
              } 
            }}
          />
        </ListItem>
      </List>
      
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          As you change your settings, the values displayed above will update automatically.
        </Typography>
      </Box>
    </Paper>
  );
};

export default SettingsDemo;