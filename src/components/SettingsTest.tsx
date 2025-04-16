// src/components/SettingsTest.tsx
import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, useTheme } from '@mui/material';
import { useSettings } from '../contexts/SettingsContext';
import useFormat from '../hooks/useFormat';

/**
 * A simple component for testing that our settings context and hooks work correctly
 */
const SettingsTest: React.FC = () => {
  const theme = useTheme();
  const { refreshExchangeRates, lastRatesUpdate } = useSettings();
  const { money, date } = useFormat();
  
  const [isLoading, setIsLoading] = useState(false);
  const [testAmount, setTestAmount] = useState(100);
  
  // Test function to simulate changing values
  const simulateValueChange = () => {
    setTestAmount(prev => {
      // Generate a random amount between 50 and 500
      const newAmount = Math.floor(Math.random() * 450) + 50;
      return newAmount;
    });
  };

  // Test function for refreshing exchange rates
  const testRefreshRates = async () => {
    setIsLoading(true);
    try {
      await refreshExchangeRates();
    } catch (error) {
      console.error('Error refreshing rates in test component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Settings Test</Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          Current test amount:
        </Typography>
        <Typography variant="h4" color="primary.main">
          {money(testAmount)}
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={simulateValueChange}
          sx={{ mt: 1 }}
        >
          Change Amount
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          Current date:
        </Typography>
        <Typography variant="body1" fontFamily="monospace">
          {date(new Date())}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Last rates update:
        </Typography>
        <Typography variant="body1">
          {lastRatesUpdate ? date(lastRatesUpdate) : 'Never'}
        </Typography>
        <Button 
          variant="outlined" 
          size="small"
          onClick={testRefreshRates}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
          sx={{ mt: 1 }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Rates'}
        </Button>
      </Box>
      
      <Typography variant="caption" color="text.secondary">
        This component tests that our settings context and formatting hooks are working correctly.
        When you change your settings, these values should update automatically.
      </Typography>
    </Paper>
  );
};

export default SettingsTest;