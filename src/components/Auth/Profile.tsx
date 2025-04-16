// src/components/auth/Profile.tsx
import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Avatar, 
  Divider, 
  Alert, 
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { AccountCircle as AccountIcon, Email as EmailIcon, VpnKey as KeyIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Profile: React.FC = () => {
  const { currentUser, updateUserEmail, updateUserPassword, reauthenticate } = useAuth();
  
  // State for email update
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  // State for password update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // State for reauthentication dialog
  const [reauthDialogOpen, setReauthDialogOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthLoading, setReauthLoading] = useState(false);
  
  // State for pending action after reauthentication
  const [pendingAction, setPendingAction] = useState<'email' | 'password' | null>(null);
  
  // State for feedback snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = re.test(email);
    
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!isValid) {
      setEmailError('Please enter a valid email address');
      return false;
    } else if (email === currentUser?.email) {
      setEmailError('New email must be different from current email');
      return false;
    } else {
      setEmailError(null);
      return true;
    }
  };

  // Validate password
  const validatePassword = (): boolean => {
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return false;
    } else if (!newPassword) {
      setPasswordError('New password is required');
      return false;
    } else if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return false;
    } else if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    } else {
      setPasswordError(null);
      return true;
    }
  };

  // Handle email update
  const handleEmailUpdate = async () => {
    if (!validateEmail(newEmail)) return;
    
    setPendingAction('email');
    setReauthDialogOpen(true);
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    if (!validatePassword()) return;
    
    setPendingAction('password');
    setReauthDialogOpen(true);
  };

  // Handle reauthentication
  const handleReauthenticate = async () => {
    if (!reauthPassword) {
      setReauthError('Password is required');
      return;
    }
    
    setReauthLoading(true);
    setReauthError(null);
    
    try {
      await reauthenticate(reauthPassword);
      
      // If reauthentication was successful, proceed with the pending action
      if (pendingAction === 'email') {
        await performEmailUpdate();
      } else if (pendingAction === 'password') {
        await performPasswordUpdate();
      }
      
      // Close the dialog
      setReauthDialogOpen(false);
      setReauthPassword('');
      setPendingAction(null);
    } catch (error: any) {
      console.error('Reauthentication error:', error);
      setReauthError('Incorrect password. Please try again.');
    } finally {
      setReauthLoading(false);
    }
  };

  // Actually perform the email update
  const performEmailUpdate = async () => {
    setIsUpdatingEmail(true);
    
    try {
      await updateUserEmail(newEmail);
      setNewEmail('');
      setSnackbar({
        open: true,
        message: 'Email updated successfully!',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Email update error:', error);
      setSnackbar({
        open: true,
        message: `Failed to update email: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Actually perform the password update
  const performPasswordUpdate = async () => {
    setIsUpdatingPassword(true);
    
    try {
      await updateUserPassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSnackbar({
        open: true,
        message: 'Password updated successfully!',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Password update error:', error);
      setSnackbar({
        open: true,
        message: `Failed to update password: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Grid container justifyContent="center" spacing={3} sx={{ p: 3 }}>
      <Grid item xs={12} md={8} lg={6}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                mr: 2
              }}
            >
              <AccountIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Your Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your account information
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Account Information Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <AccountIcon sx={{ mr: 1 }} />
              Account Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Email Address
                </Typography>
                <Typography variant="body1">
                  {currentUser?.email}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Account Created
                </Typography>
                <Typography variant="body1">
                  {currentUser?.metadata.creationTime 
                    ? new Date(currentUser.metadata.creationTime).toLocaleDateString() 
                    : 'Not available'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Last Sign In
                </Typography>
                <Typography variant="body1">
                  {currentUser?.metadata.lastSignInTime 
                    ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() 
                    : 'Not available'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Email Update Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 1 }} />
              Update Email Address
            </Typography>

            <Box component="form" noValidate>
              <TextField
                fullWidth
                label="New Email Address"
                variant="outlined"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                error={!!emailError}
                helperText={emailError}
                disabled={isUpdatingEmail}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                color="primary"
                onClick={handleEmailUpdate}
                disabled={isUpdatingEmail || !newEmail}
                sx={{ borderRadius: 2 }}
              >
                {isUpdatingEmail ? <CircularProgress size={24} /> : 'Update Email'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Password Update Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <KeyIcon sx={{ mr: 1 }} />
              Change Password
            </Typography>

            <Box component="form" noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    variant="outlined"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    variant="outlined"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    variant="outlined"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={!!passwordError}
                    helperText={passwordError}
                    disabled={isUpdatingPassword}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePasswordUpdate}
                  disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                  sx={{ borderRadius: 2 }}
                >
                  {isUpdatingPassword ? <CircularProgress size={24} /> : 'Update Password'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Reauthentication Dialog */}
      <Dialog open={reauthDialogOpen} onClose={() => setReauthDialogOpen(false)}>
        <DialogTitle>Verify Your Identity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            For security reasons, please enter your current password to continue.
          </Typography>
          
          {reauthError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reauthError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Current Password"
            type="password"
            fullWidth
            variant="outlined"
            value={reauthPassword}
            onChange={(e) => setReauthPassword(e.target.value)}
            disabled={reauthLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setReauthDialogOpen(false);
              setReauthPassword('');
              setPendingAction(null);
            }}
            disabled={reauthLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReauthenticate} 
            variant="contained" 
            disabled={reauthLoading || !reauthPassword}
          >
            {reauthLoading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default Profile;