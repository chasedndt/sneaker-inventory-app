import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  useTheme,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  Chip
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';

const SecuritySettings: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // Handle password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }
    
    try {
      // Here you would normally update the password with your auth provider
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {/* Password Update Section */}
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
          Security details
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Update your password.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Old password"
              name="currentPassword"
              type={showPassword.currentPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              variant="outlined"
              size="small"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('currentPassword')}
                      edge="end"
                    >
                      {showPassword.currentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            {/* Empty grid for alignment */}
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="New password"
              name="newPassword"
              type={showPassword.newPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              variant="outlined"
              size="small"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('newPassword')}
                      edge="end"
                    >
                      {showPassword.newPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Confirm new password"
              name="confirmPassword"
              type={showPassword.confirmPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              variant="outlined"
              size="small"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      edge="end"
                    >
                      {showPassword.confirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={loading}
            startIcon={<LockIcon />}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Password updated successfully!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Two-Factor Authentication */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Two-factor authentication
          </Typography>
          <Chip 
            label="Not Enabled" 
            color="default" 
            size="small"
            sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              fontWeight: 'medium'
            }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add an extra layer of security to your account by enabling two-factor authentication.
        </Typography>

        <Button
          variant="outlined"
          color="primary"
        >
          Enable 2FA
        </Button>
      </Paper>

      {/* Active Sessions */}
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
          Active sessions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your active sessions across different devices.
        </Typography>

        <Box sx={{ 
          p: 2, 
          borderRadius: 1, 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          mb: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Current Session
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Windows • Chrome • {new Date().toLocaleString()}
              </Typography>
            </Box>
            <Chip 
              label="This Device" 
              color="primary" 
              size="small"
              sx={{ fontWeight: 'medium' }}
            />
          </Box>
        </Box>

        <Button
          variant="outlined"
          color="error"
        >
          Sign out of all other sessions
        </Button>
      </Paper>

      {/* Account Deletion */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.error.light}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: theme.palette.error.main }}>
          Delete account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Once you delete your account, there is no going back. Please be certain.
        </Typography>

        <Button
          variant="outlined"
          color="error"
        >
          Delete Account
        </Button>
      </Paper>
    </Box>
  );
};

export default SecuritySettings;
