import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Divider,
  Grid,
  useTheme,
  Alert,
  Snackbar,
  Button,
  RadioGroup,
  Radio,
  useMediaQuery,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import EventIcon from '@mui/icons-material/Event';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { useSettings } from '../context/SettingsContext';

const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { 
    darkMode, 
    toggleDarkMode, 
    currency, 
    setCurrency, 
    dateFormat, 
    setDateFormat,
    saveSettings,
    refreshExchangeRates,
    exchangeRates,
    lastRatesUpdate
  } = useSettings();

  // Local state for settings
  const [localDarkMode, setLocalDarkMode] = useState(darkMode);
  const [localCurrency, setLocalCurrency] = useState(currency);
  const [localDateFormat, setLocalDateFormat] = useState(dateFormat);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error'
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  // Update local state when context values change
  useEffect(() => {
    setLocalDarkMode(darkMode);
    setLocalCurrency(currency);
    setLocalDateFormat(dateFormat);
  }, [darkMode, currency, dateFormat]);

  // Check if any settings have changed
  useEffect(() => {
    const settingsChanged = 
      localDarkMode !== darkMode || 
      localCurrency !== currency || 
      localDateFormat !== dateFormat;

    setHasChanges(settingsChanged);
  }, [localDarkMode, localCurrency, localDateFormat, darkMode, currency, dateFormat]);

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    setLocalDarkMode(!localDarkMode);
  };

  // Handle currency change
  const handleCurrencyChange = (event: SelectChangeEvent<string>) => {
    setLocalCurrency(event.target.value);
  };

  // Handle date format change
  const handleDateFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalDateFormat(event.target.value);
  };

  // Handle refreshing exchange rates
  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);

    try {
      const success = await refreshExchangeRates();

      if (success) {
        setSnackbar({
          open: true,
          message: 'Exchange rates updated successfully',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update exchange rates',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'An error occurred while updating exchange rates',
        severity: 'error'
      });
    } finally {
      setIsRefreshingRates(false);
    }
  };

  // Save all settings
  const handleSaveSettings = () => {
    // Apply settings to context
    if (localDarkMode !== darkMode) {
      toggleDarkMode();
    }
    if (localCurrency !== currency) {
      setCurrency(localCurrency);
    }
    if (localDateFormat !== dateFormat) {
      setDateFormat(localDateFormat);
    }

    // Save settings to persistent storage
    saveSettings({
      darkMode: localDarkMode,
      currency: localCurrency,
      dateFormat: localDateFormat
    });

    // Show success message
    setSnackbar({
      open: true,
      message: 'Settings saved successfully',
      severity: 'success'
    });
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ 
      p: { xs: 2, md: 3 },
      maxWidth: '1600px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Header */}
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 600,
          color: theme.palette.mode === 'dark' ? 'white' : 'text.primary',
        }}
      >
        Settings
      </Typography>

      {/* Settings Sections */}
      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormatListBulletedIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Appearance
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localDarkMode}
                  onChange={handleDarkModeToggle}
                  color="primary"
                  icon={<LightModeIcon />}
                  checkedIcon={<DarkModeIcon />}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1">
                    {localDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </Typography>
                  {localDarkMode ? 
                    <DarkModeIcon sx={{ ml: 1, color: theme.palette.primary.main }} /> : 
                    <LightModeIcon sx={{ ml: 1, color: '#f9a825' }} />
                  }
                </Box>
              }
              sx={{ mt: 1 }}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 'auto' }}>
              Switch between dark and light mode. Dark mode reduces eye strain in low light environments.
            </Typography>
          </Paper>
        </Grid>

        {/* Currency Settings */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CurrencyExchangeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Currency
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
              <InputLabel id="currency-select-label">Currency</InputLabel>
              <Select
                labelId="currency-select-label"
                id="currency-select"
                value={localCurrency}
                onChange={handleCurrencyChange}
                label="Currency"
              >
                <MenuItem value="USD">USD - US Dollar ($)</MenuItem>
                <MenuItem value="EUR">EUR - Euro (€)</MenuItem>
                <MenuItem value="GBP">GBP - British Pound (£)</MenuItem>
                <MenuItem value="JPY">JPY - Japanese Yen (¥)</MenuItem>
                <MenuItem value="CAD">CAD - Canadian Dollar (C$)</MenuItem>
                <MenuItem value="AUD">AUD - Australian Dollar (A$)</MenuItem>
                <MenuItem value="CNY">CNY - Chinese Yuan (¥)</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Exchange rates last updated: {lastRatesUpdate ? new Date(lastRatesUpdate).toLocaleString() : 'Never'}
              </Typography>
              
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefreshRates}
                disabled={isRefreshingRates}
                startIcon={<RefreshIcon />}
              >
                {isRefreshingRates ? 'Updating...' : 'Refresh Rates'}
              </Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 'auto' }}>
              Select your preferred currency. All monetary values will be converted and displayed in this currency.
            </Typography>
            
            {/* Current Exchange Rates */}
            {exchangeRates && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <InfoIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.info.main }} />
                  Current Exchange Rates (vs USD)
                </Typography>
                <TableContainer sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Currency</TableCell>
                        <TableCell align="right">Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(exchangeRates)
                        .filter(([code]) => ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'].includes(code))
                        .map(([currencyCode, rate]) => (
                        <TableRow key={currencyCode} hover>
                          <TableCell component="th" scope="row">
                            {currencyCode === localCurrency ? (
                              <Chip 
                                size="small" 
                                label={currencyCode} 
                                color="primary" 
                                variant="outlined" 
                                sx={{ fontWeight: 'bold' }}
                              />
                            ) : (
                              currencyCode
                            )}
                          </TableCell>
                          <TableCell align="right">{(rate as number).toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Date Format Settings */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column' 
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Date Format
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="date-format"
                name="date-format"
                value={localDateFormat}
                onChange={handleDateFormatChange}
              >
                <FormControlLabel value="MM/DD/YYYY" control={<Radio />} label="MM/DD/YYYY (ex: 04/02/2025)" />
                <FormControlLabel value="DD/MM/YYYY" control={<Radio />} label="DD/MM/YYYY (ex: 02/04/2025)" />
                <FormControlLabel value="YYYY-MM-DD" control={<Radio />} label="YYYY-MM-DD (ex: 2025-04-02)" />
              </RadioGroup>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 'auto' }}>
              Choose how dates are displayed throughout the application.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Backup & Export Section */}
      <Grid item xs={12}>
        <Paper 
          sx={{ 
            p: 3, 
            mt: 2,
            borderRadius: 2,
            bgcolor: theme.palette.background.paper
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SaveIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Backup & Export
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Export Settings</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export your settings as a JSON file that you can import later or on another device.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => {
                  // Create settings object
                  const exportData = {
                    darkMode: localDarkMode,
                    currency: localCurrency,
                    dateFormat: localDateFormat,
                    exportDate: new Date().toISOString()
                  };
                  
                  // Convert to JSON
                  const jsonString = JSON.stringify(exportData, null, 2);
                  
                  // Create download link
                  const blob = new Blob([jsonString], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `hypelist-settings-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  
                  // Clean up
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  setSnackbar({
                    open: true,
                    message: 'Settings exported successfully',
                    severity: 'success'
                  });
                }}
              >
                Export Settings
              </Button>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Import Settings</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Import settings from a previously exported JSON file.
              </Typography>
              <Button
                variant="outlined"
                component="label"
              >
                Import Settings
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        // Parse the JSON
                        const importedSettings = JSON.parse(event.target?.result as string);
                        
                        // Validate the imported settings
                        if (
                          typeof importedSettings.darkMode !== 'boolean' ||
                          typeof importedSettings.currency !== 'string' ||
                          typeof importedSettings.dateFormat !== 'string'
                        ) {
                          throw new Error('Invalid settings format');
                        }
                        
                        // Update local settings
                        setLocalDarkMode(importedSettings.darkMode);
                        setLocalCurrency(importedSettings.currency);
                        setLocalDateFormat(importedSettings.dateFormat);
                        
                        // Set hasChanges to true to enable the save button
                        setHasChanges(true);
                        
                        setSnackbar({
                          open: true,
                          message: 'Settings imported successfully. Click Save to apply.',
                          severity: 'success'
                        });
                      } catch (error) {
                        console.error('Error importing settings:', error);
                        setSnackbar({
                          open: true,
                          message: 'Failed to import settings. Invalid file format.',
                          severity: 'error'
                        });
                      }
                    };
                    
                    reader.readAsText(file);
                  }}
                />
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={!hasChanges}
          sx={{
            px: 4,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Save Settings
        </Button>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;