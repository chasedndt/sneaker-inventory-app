import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  useTheme,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Product categories for reselling preferences
const productCategories = [
  'Sneakers', 'Streetwear', 'Collectibles', 'Electronics', 'Accessories'
];

const ProfileSettings: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currency: appCurrency, setCurrency } = useSettings();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User details state - initialize from localStorage if available
  const [userDetails, setUserDetails] = useState(() => {
    const savedUserDetails = localStorage.getItem('user_details');
    if (savedUserDetails) {
      try {
        const parsed = JSON.parse(savedUserDetails);
        // Ensure we always have the current email
        return { ...parsed, email: currentUser?.email || parsed.email || '' };
      } catch (e) {
        console.error('Failed to parse saved user details:', e);
      }
    }
    return {
      firstName: '',
      lastName: '',
      email: currentUser?.email || '',
      phone: '',
      avatar: ''
    };
  });

  // Business details state - initialize from localStorage if available
  const [businessDetails, setBusinessDetails] = useState(() => {
    const savedBusinessDetails = localStorage.getItem('business_details');
    if (savedBusinessDetails) {
      try {
        const parsed = JSON.parse(savedBusinessDetails);
        // Ensure we always have the current currency from settings
        return { ...parsed, currency: appCurrency };
      } catch (e) {
        console.error('Failed to parse saved business details:', e);
      }
    }
    return {
      businessName: 'Top Notch Kicks',
      country: 'United Kingdom',
      currency: appCurrency, // Use the current app currency
      taxSettings: 'Value Tax',
      timezone: 'America / New York (GMT-05:00)',
      resellingPreferences: ['Sneakers', 'Streetwear']
    };
  });
  
  // Update business details when app currency changes
  useEffect(() => {
    setBusinessDetails((prev: Record<string, any>) => ({
      ...prev,
      currency: appCurrency
    }));
  }, [appCurrency]);

  // Handle user details change
  const handleUserDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserDetails((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  // Handle business details change
  const handleBusinessDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBusinessDetails((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  // Handle currency change
  const handleCurrencyChange = (event: SelectChangeEvent<string>) => {
    const newCurrency = event.target.value;
    setBusinessDetails((prev: Record<string, any>) => ({ ...prev, currency: newCurrency }));
  };

  // Handle tax settings change
  const handleTaxSettingsChange = (event: SelectChangeEvent<string>) => {
    setBusinessDetails((prev: Record<string, any>) => ({ ...prev, taxSettings: event.target.value }));
  };

  // Handle reselling preferences change
  const handleResellingPreferencesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setBusinessDetails((prev: Record<string, any>) => ({
      ...prev,
      resellingPreferences: typeof value === 'string' ? value.split(',') : value
    }));
  };

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Here you would normally upload the file to your server
      // For now, we'll just create a local URL
      const reader = new FileReader();
      reader.onload = () => {
        setUserDetails((prev: Record<string, any>) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Save user details to localStorage for persistence
      localStorage.setItem('user_details', JSON.stringify(userDetails));
      console.log('User details saved:', userDetails);
      
      // Update app currency if it has changed
      if (businessDetails.currency !== appCurrency) {
        setCurrency(businessDetails.currency);
        console.log('Currency updated to:', businessDetails.currency);
      }
      
      // Save business details to localStorage for persistence
      localStorage.setItem('business_details', JSON.stringify(businessDetails));
      console.log('Business details saved:', businessDetails);
      
      // Here you would save other data to your server
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {/* User Details Section */}
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
          User details
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Update your personal information.
        </Typography>

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4} md={3} lg={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar
                src={userDetails.avatar || (currentUser?.photoURL || '')}
                alt={`${userDetails.firstName} ${userDetails.lastName}`}
                sx={{ width: 100, height: 100, mb: 2 }}
              />
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="avatar-upload"
                type="file"
                onChange={handleAvatarUpload}
              />
              <label htmlFor="avatar-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCameraIcon />}
                  size="small"
                >
                  Upload avatar
                </Button>
              </label>
            </Box>
          </Grid>

          <Grid item xs={12} sm={8} md={9} lg={10}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First name"
                  name="firstName"
                  value={userDetails.firstName}
                  onChange={handleUserDetailsChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last name"
                  name="lastName"
                  value={userDetails.lastName}
                  onChange={handleUserDetailsChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={userDetails.email}
                  onChange={handleUserDetailsChange}
                  variant="outlined"
                  size="small"
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={userDetails.phone}
                  onChange={handleUserDetailsChange}
                  variant="outlined"
                  size="small"
                  placeholder="+1 (555) 123-4567"
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Business Details Section */}
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
          Business details
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Update your business preferences.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Business name"
              name="businessName"
              value={businessDetails.businessName}
              onChange={handleBusinessDetailsChange}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={businessDetails.country}
              onChange={handleBusinessDetailsChange}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="currency-label">Currency</InputLabel>
              <Select
                labelId="currency-label"
                id="currency"
                value={businessDetails.currency}
                label="Currency"
                onChange={handleCurrencyChange}
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
              <InputLabel id="tax-settings-label">Tax settings</InputLabel>
              <Select
                labelId="tax-settings-label"
                id="taxSettings"
                value={businessDetails.taxSettings}
                label="Tax settings"
                onChange={handleTaxSettingsChange}
              >
                <MenuItem value="None">No Tax</MenuItem>
                <MenuItem value="Value Tax">Value Added Tax (VAT)</MenuItem>
                <MenuItem value="Sales Tax">Sales Tax</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Timezone"
              name="timezone"
              value={businessDetails.timezone}
              onChange={handleBusinessDetailsChange}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="reselling-preferences-label">
                Reselling preferences
              </InputLabel>
              <Select
                labelId="reselling-preferences-label"
                id="resellingPreferences"
                multiple
                value={businessDetails.resellingPreferences}
                onChange={handleResellingPreferencesChange}
                label="Reselling preferences"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {productCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
          {loading ? 'Saving...' : 'Save changes'}
        </Button>
      </Box>

      {/* Success/Error Feedback */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Profile updated successfully!
        </Alert>
      </Snackbar>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ProfileSettings;
