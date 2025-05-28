import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  useTheme,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { useSettings } from '../../contexts/SettingsContext';
import SaveIcon from '@mui/icons-material/Save';

const InventorySettings: React.FC = () => {
  const theme = useTheme();
  const { currency, setCurrency } = useSettings();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Inventory settings state
  const [inventorySettings, setInventorySettings] = useState({
    dateFormat: 'DD/MM/YYYY',
    lowStockThreshold: 5,
    enableLowStockAlerts: true,
    defaultView: 'grid',
    enableAutomaticPricing: false,
    enableBarcodeScan: true
  });
  
  // Initialize currency from global settings
  useEffect(() => {
    console.log('Using global currency setting in Inventory Settings:', currency);
  }, [currency]);

  // Handle text field change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInventorySettings(prev => ({ ...prev, [name]: value }));
  };

  // Handle select change
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    // Currency is handled separately through the global settings
    if (name === 'currency') {
      setCurrency(value);
    } else {
      setInventorySettings(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle switch change
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setInventorySettings(prev => ({ ...prev, [name]: checked }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Here you would normally save the data to your server
      // For now, we'll just simulate a delay and log the changes
      console.log('Saving inventory settings:', {
        ...inventorySettings,
        currency // Using the global currency setting
      });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {/* General Inventory Settings */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          General inventory settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure your inventory preferences.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="default-currency-label">Default currency</InputLabel>
              <Select
                labelId="default-currency-label"
                id="currency"
                name="currency"
                value={currency}
                label="Default currency"
                onChange={handleSelectChange}
              >
                <MenuItem value="USD">US Dollar ($)</MenuItem>
                <MenuItem value="EUR">Euro (€)</MenuItem>
                <MenuItem value="GBP">British Pound (£)</MenuItem>
                <MenuItem value="JPY">Japanese Yen (¥)</MenuItem>
                <MenuItem value="CAD">Canadian Dollar (C$)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="date-format-label">Date format</InputLabel>
              <Select
                labelId="date-format-label"
                id="dateFormat"
                name="dateFormat"
                value={inventorySettings.dateFormat}
                label="Date format"
                onChange={handleSelectChange}
              >
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Low stock threshold"
              name="lowStockThreshold"
              type="number"
              value={inventorySettings.lowStockThreshold}
              onChange={handleTextChange}
              variant="outlined"
              size="small"
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="default-view-label">Default view</InputLabel>
              <Select
                labelId="default-view-label"
                id="defaultView"
                name="defaultView"
                value={inventorySettings.defaultView}
                label="Default view"
                onChange={handleSelectChange}
              >
                <MenuItem value="grid">Grid</MenuItem>
                <MenuItem value="list">List</MenuItem>
                <MenuItem value="table">Table</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Features Settings */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Features
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enable or disable inventory features.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={inventorySettings.enableLowStockAlerts}
                  onChange={handleSwitchChange}
                  name="enableLowStockAlerts"
                  color="primary"
                />
              }
              label="Low stock alerts"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Get notified when items fall below the low stock threshold.
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={inventorySettings.enableAutomaticPricing}
                  onChange={handleSwitchChange}
                  name="enableAutomaticPricing"
                  color="primary"
                />
              }
              label="Automatic pricing suggestions"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Get price suggestions based on market data.
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={inventorySettings.enableBarcodeScan}
                  onChange={handleSwitchChange}
                  name="enableBarcodeScan"
                  color="primary"
                />
              }
              label="Barcode scanning"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Enable barcode scanning for quick item lookup.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={loading}
          startIcon={<SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save settings'}
        </Button>
      </Box>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Inventory settings updated successfully!
        </Alert>
      )}
    </Box>
  );
};

export default InventorySettings;
